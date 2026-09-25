import { createSyncLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import {
  RESOURCE_TYPE_CONDITION,
  RESOURCE_TYPE_MEDICATION_REQUEST,
  RESOURCE_TYPE_PATIENT,
} from './resourceTypes';

const log = createSyncLogger('completion');

const TERMINAL_TASK_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const TERMINAL_JOB_STATUSES = new Set(['COMPLETED', 'FAILED', 'PARTIAL', 'CANCELLED']);

// The shared, idempotent "is the job actually done" check — see "Who marks the job complete" in
// the sync engine plan. Any task (Patient, Condition, Medication, backfill) calls this after its
// own terminal transition; whichever call happens to find everything else already done is the one
// that finalizes the job. Safe to call redundantly — already-finalized jobs are a no-op.
export async function recomputeJobStatus(jobId: string): Promise<void> {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId }, include: { tasks: true } });
  if (!job || TERMINAL_JOB_STATUSES.has(job.status)) return;

  const patientTask = job.tasks.find((t) => t.resourceType === RESOURCE_TYPE_PATIENT);
  if (!patientTask || !TERMINAL_TASK_STATUSES.has(patientTask.status)) return;

  if (patientTask.status === 'FAILED') {
    await prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        allTasksCompleted: false,
        finishedAt: new Date(),
        errorMessage:
          patientTask.lastError ?? 'Patient sync failed before clinical sync could start',
      },
    });
    log.info('job finalized', { jobId, status: 'FAILED', reason: 'patient task failed' });
    return;
  }

  const conditionTask = job.tasks.find((t) => t.resourceType === RESOURCE_TYPE_CONDITION);
  const medicationTask = job.tasks.find((t) => t.resourceType === RESOURCE_TYPE_MEDICATION_REQUEST);
  if (!conditionTask || !medicationTask) return; // Patient completed, but hasn't created them yet
  if (
    !TERMINAL_TASK_STATUSES.has(conditionTask.status) ||
    !TERMINAL_TASK_STATUSES.has(medicationTask.status)
  ) {
    return;
  }

  // SyncMissingPatientRef.PENDING is the precise signal for "reconciliation still pending" — a
  // raw-vs-normalized anti-join was tried as an extra safety net here, but it can't distinguish a
  // record that's temporarily blocked on a missing patient from one that permanently failed to
  // normalize (e.g. malformed data with no subject reference) and will never gain a normalized
  // row; the latter is already accounted for via SyncJobStat.failed and a SyncJobEvent, so it must
  // not block completion.
  const pendingMissing = await prisma.syncMissingPatientRef.count({
    where: { jobId, status: 'PENDING' },
  });
  if (pendingMissing > 0) return;

  const failedMissing = await prisma.syncMissingPatientRef.count({
    where: { jobId, status: 'FAILED' },
  });
  const failedRecords = await prisma.syncJobStat.aggregate({
    where: { jobId },
    _sum: { failed: true },
  });
  // 'per-patient' providers (Oracle): a permanently-failed batch is a partial-failure signal too —
  // unlike a failed SyncTask (which means the whole resource type didn't get scanned), one failed
  // batch among several independent ones doesn't block the others, but it does mean some patients'
  // data is missing, so it should still land the job on PARTIAL rather than a silent COMPLETED.
  const failedBatches = await prisma.syncClinicalBatch.count({
    where: { jobId, status: 'FAILED' },
  });
  // "Fully scanned" — every page of every task's search was walked — independent of whether
  // individual records within those pages failed to normalize or a missing-patient backfill
  // permanently failed. Only a task itself failing (couldn't complete its page walk at all) means
  // we didn't actually see everything, so only that disqualifies this job as a watermark source.
  const anyTaskFailed = [patientTask, conditionTask, medicationTask].some(
    (t) => t.status === 'FAILED',
  );
  const hasPartialFailures =
    anyTaskFailed || failedMissing > 0 || failedBatches > 0 || (failedRecords._sum.failed ?? 0) > 0;
  const status = hasPartialFailures ? 'PARTIAL' : 'COMPLETED';
  // A maxRecords-capped run deliberately didn't scan everything, so it can never be a safe
  // incremental checkpoint for a future run — regardless of whether every task/batch otherwise
  // "succeeded" within its truncated scope.
  const allTasksCompleted = !anyTaskFailed && job.maxRecordsPerTask == null;

  await prisma.syncJob.update({
    where: { id: jobId },
    data: { status, allTasksCompleted, finishedAt: new Date() },
  });
  log.info('job finalized', { jobId, status, allTasksCompleted });
}

// Only relevant for 'per-patient'-scoped providers (Oracle) — HAPI's tasks finalize themselves
// directly in patientWalkHandler/clinicalWalkHandler and never create SyncClinicalBatch rows.
// Structurally identical to recomputeJobStatus above: called whenever a batch reaches a terminal
// state; whichever call finds the count at zero is the one that finalizes the parent task. Safe to
// call redundantly.
export async function recomputeClinicalTaskStatus(
  jobId: string,
  resourceType: string,
): Promise<void> {
  const task = await prisma.syncTask.findUnique({
    where: { jobId_resourceType: { jobId, resourceType } },
  });
  if (!task || TERMINAL_TASK_STATUSES.has(task.status)) return;

  const nonTerminal = await prisma.syncClinicalBatch.count({
    where: { jobId, resourceType, status: { notIn: ['COMPLETED', 'FAILED', 'CANCELLED'] } },
  });
  if (nonTerminal > 0) return;

  const [totalBatches, failedBatchCount] = await Promise.all([
    prisma.syncClinicalBatch.count({ where: { jobId, resourceType } }),
    prisma.syncClinicalBatch.count({ where: { jobId, resourceType, status: 'FAILED' } }),
  ]);
  // FAILED only if literally every batch failed — otherwise COMPLETED, since a batch failing
  // doesn't block the others (they're independent), and recomputeJobStatus's failedBatches check
  // is what surfaces "some batches failed" at the job level (PARTIAL), not this task's own status.
  const taskStatus = totalBatches > 0 && failedBatchCount === totalBatches ? 'FAILED' : 'COMPLETED';

  await prisma.syncTask.update({
    where: { id: task.id },
    data: { status: taskStatus },
  });
  log.info('clinical task finalized', {
    jobId,
    resourceType,
    status: taskStatus,
    totalBatches,
    failedBatchCount,
  });

  await recomputeJobStatus(jobId);
}
