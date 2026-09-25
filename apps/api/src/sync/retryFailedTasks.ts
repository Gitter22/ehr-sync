import { createSyncLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import {
  boss,
  queueForClinicalBatch,
  queueForClinicalPage,
  QUEUE_BACKFILL,
  QUEUE_PATIENT_PAGE,
} from './queue';
import {
  RESOURCE_TYPE_CONDITION,
  RESOURCE_TYPE_MEDICATION_REQUEST,
  RESOURCE_TYPE_PATIENT,
  type ClinicalResourceType,
} from './resourceTypes';

const log = createSyncLogger('retry');

function queueFor(resourceType: string): string {
  if (resourceType === RESOURCE_TYPE_PATIENT) return QUEUE_PATIENT_PAGE;
  return queueForClinicalPage(resourceType as ClinicalResourceType);
}

// Re-enqueues only FAILED tasks/batches for a job — "only the failed records can be retried" from
// the requirements. Already-COMPLETED tasks/batches and their data are untouched.
export async function retrySyncJob(jobId: string): Promise<{
  retriedTasks: number;
  retriedBatches: number;
  retriedMissingPatients: number;
}> {
  const failedTasks = await prisma.syncTask.findMany({ where: { jobId, status: 'FAILED' } });
  // 'per-patient' providers (Oracle): a task's resourceType having FAILED SyncClinicalBatch rows
  // means it's batch-scoped, so a generic "resume the cursor" queue message doesn't apply — its
  // actual retry is re-enqueueing those specific batches below. Also covers the mixed case where
  // the parent task already rolled up to COMPLETED even though some of its batches failed.
  const failedBatches = await prisma.syncClinicalBatch.findMany({
    where: { jobId, status: 'FAILED' },
  });
  const batchScopedResourceTypes = new Set(failedBatches.map((b) => b.resourceType));

  for (const task of failedTasks) {
    await prisma.syncTask.update({ where: { id: task.id }, data: { status: 'PENDING' } });
    if (batchScopedResourceTypes.has(task.resourceType)) continue;

    const payload =
      task.resourceType === RESOURCE_TYPE_PATIENT
        ? { jobId }
        : {
            jobId,
            resourceType: task.resourceType as
              typeof RESOURCE_TYPE_CONDITION | typeof RESOURCE_TYPE_MEDICATION_REQUEST,
          };
    await boss.send(queueFor(task.resourceType), payload);
  }

  for (const batch of failedBatches) {
    await prisma.syncClinicalBatch.update({ where: { id: batch.id }, data: { status: 'PENDING' } });
    await boss.send(queueForClinicalBatch(batch.resourceType as ClinicalResourceType), {
      batchId: batch.id,
    });
  }
  if (failedBatches.length > 0) {
    // Reset the parent task too, even if it had already rolled up to COMPLETED (mixed outcome) —
    // recomputeClinicalTaskStatus re-finalizes it once the retried batch(es) complete again.
    await prisma.syncTask.updateMany({
      where: { jobId, resourceType: { in: [...batchScopedResourceTypes] } },
      data: { status: 'RUNNING' },
    });
  }

  const failedMissingPatients = await prisma.syncMissingPatientRef.updateMany({
    where: { jobId, status: 'FAILED' },
    data: { status: 'PENDING' },
  });
  if (failedMissingPatients.count > 0) {
    await boss.send(QUEUE_BACKFILL, { jobId });
  }

  if (failedTasks.length > 0 || failedBatches.length > 0 || failedMissingPatients.count > 0) {
    await prisma.syncJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', finishedAt: null },
    });
  }

  log.info('job retry requested', {
    jobId,
    retriedTasks: failedTasks.length,
    retriedBatches: failedBatches.length,
    retriedMissingPatients: failedMissingPatients.count,
  });

  return {
    retriedTasks: failedTasks.length,
    retriedBatches: failedBatches.length,
    retriedMissingPatients: failedMissingPatients.count,
  };
}
