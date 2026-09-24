import { prisma } from '../lib/prisma';
import { boss, QUEUE_BACKFILL, QUEUE_CLINICAL_PAGE, QUEUE_PATIENT_PAGE } from './queue';
import {
  RESOURCE_TYPE_CONDITION,
  RESOURCE_TYPE_MEDICATION_REQUEST,
  RESOURCE_TYPE_PATIENT,
} from './resourceTypes';

function queueFor(resourceType: string): string {
  if (resourceType === RESOURCE_TYPE_PATIENT) return QUEUE_PATIENT_PAGE;
  return QUEUE_CLINICAL_PAGE;
}

// Re-enqueues only FAILED tasks for a job, from their stored cursorUrl — "only the failed records
// can be retried" from the requirements. Already-COMPLETED tasks and their data are untouched.
export async function retrySyncJob(
  jobId: string,
): Promise<{ retriedTasks: number; retriedMissingPatients: number }> {
  const failedTasks = await prisma.syncTask.findMany({ where: { jobId, status: 'FAILED' } });

  for (const task of failedTasks) {
    await prisma.syncTask.update({
      where: { id: task.id },
      data: { status: 'PENDING' },
    });
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

  const failedMissingPatients = await prisma.syncMissingPatientRef.updateMany({
    where: { jobId, status: 'FAILED' },
    data: { status: 'PENDING' },
  });
  if (failedMissingPatients.count > 0) {
    await boss.send(QUEUE_BACKFILL, { jobId });
  }

  if (failedTasks.length > 0 || failedMissingPatients.count > 0) {
    await prisma.syncJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', finishedAt: null },
    });
  }

  return { retriedTasks: failedTasks.length, retriedMissingPatients: failedMissingPatients.count };
}
