import { prisma } from '../lib/prisma';

// Called at the top of each handler (Patient/Condition/MedicationRequest walk), right after
// loading the job, before any FHIR HTTP call. Cancellation takes effect at this page boundary — a
// page already in flight when cancel was requested still completes and its data still lands
// (harmless, idempotent), but no further page starts. The task's cursorUrl is left untouched (not
// cleared) so its stopping point stays visible/preservable if resuming a cancelled job is ever
// supported later.
export async function markTaskCancelledIfNeeded(
  jobId: string,
  resourceType: string,
): Promise<void> {
  await prisma.syncTask.updateMany({
    where: { jobId, resourceType, status: { in: ['PENDING', 'RUNNING'] } },
    data: { status: 'CANCELLED' },
  });
}

// Same idea, for a single 'per-patient'-scoped batch (Oracle) — called from
// clinicalBatchHandler.ts right after loading the batch, before any FHIR HTTP call.
export async function markBatchCancelledIfNeeded(batchId: string): Promise<void> {
  await prisma.syncClinicalBatch.updateMany({
    where: { id: batchId, status: { in: ['PENDING', 'RUNNING'] } },
    data: { status: 'CANCELLED' },
  });
}
