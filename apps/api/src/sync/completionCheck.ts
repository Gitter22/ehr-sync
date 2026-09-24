import { prisma } from '../lib/prisma';
import {
  RESOURCE_TYPE_CONDITION,
  RESOURCE_TYPE_MEDICATION_REQUEST,
  RESOURCE_TYPE_PATIENT,
} from './resourceTypes';

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
  // "Fully scanned" — every page of every task's search was walked — independent of whether
  // individual records within those pages failed to normalize or a missing-patient backfill
  // permanently failed. Only a task itself failing (couldn't complete its page walk at all) means
  // we didn't actually see everything, so only that disqualifies this job as a watermark source.
  const anyTaskFailed = [patientTask, conditionTask, medicationTask].some(
    (t) => t.status === 'FAILED',
  );
  const hasPartialFailures =
    anyTaskFailed || failedMissing > 0 || (failedRecords._sum.failed ?? 0) > 0;
  const status = hasPartialFailures ? 'PARTIAL' : 'COMPLETED';

  await prisma.syncJob.update({
    where: { id: jobId },
    data: { status, allTasksCompleted: !anyTaskFailed, finishedAt: new Date() },
  });
}
