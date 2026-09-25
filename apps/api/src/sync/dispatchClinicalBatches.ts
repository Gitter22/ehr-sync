import { createSyncLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { boss, queueForClinicalBatch } from './queue';
import {
  RESOURCE_TYPE_CONDITION,
  RESOURCE_TYPE_MEDICATION_REQUEST,
  RESOURCE_TYPE_PATIENT,
} from './resourceTypes';

const log = createSyncLogger('batch-dispatch');

const BATCH_SIZE = 10;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Only called for 'per-patient'-scoped providers (Oracle), once the Patient task has fully
// completed. Every batch is created and enqueued here, all at once — there is no incremental,
// per-page dispatch and no "which batch are we on" pointer, since each batch is an independent,
// crash-resumable pg-boss job from the start (see the plan's "Dispatch" section for why).
export async function dispatchClinicalBatches(jobId: string): Promise<void> {
  // The exact patient set *this job* touched — precise even if other jobs/sources also wrote
  // Patient rows in the meantime.
  const rawPatients = await prisma.rawFhirResource.findMany({
    where: { syncJobId: jobId, resourceType: RESOURCE_TYPE_PATIENT },
    select: { fhirId: true },
    distinct: ['fhirId'],
  });
  const patientFhirIds = rawPatients.map((r) => r.fhirId);
  const batches = chunk(patientFhirIds, BATCH_SIZE);
  log.info('dispatching clinical batches', {
    jobId,
    patientCount: patientFhirIds.length,
    batchCount: batches.length,
    batchSize: BATCH_SIZE,
  });

  for (const resourceType of [RESOURCE_TYPE_CONDITION, RESOURCE_TYPE_MEDICATION_REQUEST] as const) {
    // Idempotent — same guard used by the 'global' dispatch path.
    const existingTask = await prisma.syncTask.findUnique({
      where: { jobId_resourceType: { jobId, resourceType } },
    });
    if (existingTask) continue;

    await prisma.$transaction(async (tx) => {
      await tx.syncTask.create({
        data: {
          jobId,
          resourceType,
          // No patients matched the search — nothing to walk, this resource type is trivially done.
          status: batches.length > 0 ? 'RUNNING' : 'COMPLETED',
        },
      });
      if (batches.length > 0) {
        await tx.syncClinicalBatch.createMany({
          data: batches.map((patientIds, batchIndex) => ({
            jobId,
            resourceType,
            batchIndex,
            patientFhirIds: patientIds,
            status: 'PENDING',
          })),
        });
      }
    });

    const createdBatches = await prisma.syncClinicalBatch.findMany({
      where: { jobId, resourceType },
      select: { id: true },
    });
    for (const batch of createdBatches) {
      await boss.send(queueForClinicalBatch(resourceType), { batchId: batch.id });
    }
    log.info('batches enqueued', { jobId, resourceType, batchCount: createdBatches.length });
  }
}
