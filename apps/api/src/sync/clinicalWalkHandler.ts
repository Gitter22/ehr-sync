import { fetchPage } from '../fhir/pagination';
import type { FhirCondition, FhirMedicationRequest, FhirResource } from '../fhir/types';
import { prisma } from '../lib/prisma';
import { normalizeCondition, type NormalizedCondition } from '../normalize/condition';
import {
  normalizeMedicationRequest,
  type NormalizedMedicationRequest,
} from '../normalize/medicationRequest';
import { markTaskCancelledIfNeeded } from './cancellation';
import { recomputeJobStatus } from './completionCheck';
import { boss, QUEUE_BACKFILL, QUEUE_CLINICAL_PAGE } from './queue';
import { RESOURCE_TYPE_CONDITION, type ClinicalResourceType } from './resourceTypes';
import {
  bulkUpsertConditions,
  bulkUpsertMedicationRequests,
  bulkUpsertMissingPatientRefs,
  bulkUpsertRaw,
  resolvePatientIds,
} from './upsert';

type NormalizedClinicalRecord = NormalizedCondition | NormalizedMedicationRequest;

function normalizeOne(
  resourceType: ClinicalResourceType,
  raw: FhirResource,
): NormalizedClinicalRecord {
  return resourceType === RESOURCE_TYPE_CONDITION
    ? normalizeCondition(raw as FhirCondition)
    : normalizeMedicationRequest(raw as FhirMedicationRequest);
}

// Processes one page for a Condition or MedicationRequest task — queried globally, filtered by
// `_lastUpdated`, independent of the Patient walk (see "Why a missing patient can still happen"
// in the plan). A record whose patient isn't locally known yet still gets its raw JSON stored, but
// its normalized row is deferred to the backfill step via SyncMissingPatientRef.
export async function processClinicalPage(
  jobId: string,
  resourceType: ClinicalResourceType,
): Promise<void> {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (job.status === 'CANCELLED') {
    await markTaskCancelledIfNeeded(jobId, resourceType);
    return;
  }

  const task = await prisma.syncTask.findUnique({
    where: { jobId_resourceType: { jobId, resourceType } },
  });
  if (!task || (task.status !== 'PENDING' && task.status !== 'RUNNING') || !task.cursorUrl) return;

  const { resources, nextUrl } = await fetchPage(task.cursorUrl);

  const normalized = resources.map((raw) => {
    try {
      return { ok: true as const, raw, value: normalizeOne(resourceType, raw) };
    } catch (error) {
      return { ok: false as const, raw, error };
    }
  });

  let missingPatientCount = 0;

  await prisma.$transaction(async (tx) => {
    await bulkUpsertRaw(
      tx,
      job.source,
      resourceType,
      jobId,
      resources.map((raw) => ({
        fhirId: raw.id,
        raw,
        sourceLastUpdated: raw.meta?.lastUpdated ? new Date(raw.meta.lastUpdated) : null,
      })),
    );

    const okItems = normalized.filter((n) => n.ok).map((n) => n.value);
    const patientIdMap = await resolvePatientIds(tx, job.source, [
      ...new Set(okItems.map((i) => i.patientFhirId)),
    ]);

    const ready = okItems
      .filter((i) => patientIdMap.has(i.patientFhirId))
      .map((i) => ({ ...i, patientId: patientIdMap.get(i.patientFhirId)! }));
    const missing = okItems.filter((i) => !patientIdMap.has(i.patientFhirId));
    missingPatientCount = missing.length;

    const { created, updated } =
      resourceType === RESOURCE_TYPE_CONDITION
        ? await bulkUpsertConditions(tx, job.source, ready as never)
        : await bulkUpsertMedicationRequests(tx, job.source, ready as never);

    if (missing.length > 0) {
      await bulkUpsertMissingPatientRefs(tx, jobId, job.source, [
        ...new Set(missing.map((i) => i.patientFhirId)),
      ]);
    }

    const failedItems = normalized.filter((n) => !n.ok);
    if (failedItems.length > 0) {
      await tx.syncJobEvent.createMany({
        data: failedItems.map((n) => ({
          jobId,
          level: 'warn',
          message: `Failed to normalize ${resourceType} ${n.raw.id}`,
          context: { error: n.error instanceof Error ? n.error.message : String(n.error) },
        })),
      });
    }

    await tx.syncJobStat.upsert({
      where: { jobId_resourceType: { jobId, resourceType } },
      create: {
        jobId,
        resourceType,
        fetched: resources.length,
        created,
        updated,
        failed: failedItems.length,
      },
      update: {
        fetched: { increment: resources.length },
        created: { increment: created },
        updated: { increment: updated },
        failed: { increment: failedItems.length },
      },
    });

    await tx.syncTask.update({
      where: { id: task.id },
      data: nextUrl
        ? { cursorUrl: nextUrl, status: 'RUNNING' }
        : { cursorUrl: null, status: 'COMPLETED' },
    });
  });

  if (missingPatientCount > 0) {
    await boss.send(QUEUE_BACKFILL, { jobId });
  }

  if (nextUrl) {
    await boss.send(QUEUE_CLINICAL_PAGE, { jobId, resourceType });
    return;
  }

  await recomputeJobStatus(jobId);
}
