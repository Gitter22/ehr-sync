import { getProvider } from '../fhir/providers/registry';
import type { FhirProvider } from '../fhir/providers/types';
import type { FhirCondition, FhirMedicationRequest, FhirResource } from '../fhir/types';
import { createSyncLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import type { NormalizedCondition } from '../normalize/condition';
import type { NormalizedMedicationRequest } from '../normalize/medicationRequest';
import { markTaskCancelledIfNeeded } from './cancellation';
import { recomputeJobStatus } from './completionCheck';
import { isMaxRecordsReached } from './maxRecordsGuard';
import { boss, queueForClinicalPage, QUEUE_BACKFILL } from './queue';
import { RESOURCE_TYPE_CONDITION, type ClinicalResourceType } from './resourceTypes';
import type { RetryContext } from './retryContext';
import { recordTaskFailure } from './taskFailure';
import {
  bulkUpsertConditions,
  bulkUpsertMedicationRequests,
  bulkUpsertMissingPatientRefs,
  bulkUpsertRaw,
  resolvePatientIds,
} from './upsert';

const log = createSyncLogger('clinical');

type NormalizedClinicalRecord = NormalizedCondition | NormalizedMedicationRequest;

function normalizeOne(
  provider: FhirProvider,
  resourceType: ClinicalResourceType,
  raw: FhirResource,
): NormalizedClinicalRecord {
  return resourceType === RESOURCE_TYPE_CONDITION
    ? provider.normalizeCondition(raw as FhirCondition)
    : provider.normalizeMedicationRequest(raw as FhirMedicationRequest);
}

// Processes one page for a Condition or MedicationRequest task — queried globally, filtered by
// `_lastUpdated`, independent of the Patient walk (see "Why a missing patient can still happen"
// in the plan). A record whose patient isn't locally known yet still gets its raw JSON stored, but
// its normalized row is deferred to the backfill step via SyncMissingPatientRef.
export async function processClinicalPage(
  jobId: string,
  resourceType: ClinicalResourceType,
  retry: RetryContext,
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

  const provider = getProvider(job.source);
  log.info('fetching clinical page', { jobId, resourceType, url: task.cursorUrl });
  let nextUrl: string | null;
  let missingPatientCount = 0;

  try {
    const page = await provider.fetchPage(task.cursorUrl);
    const resources = page.resources;
    nextUrl = page.nextUrl;

    const normalized = resources.map((raw) => {
      try {
        return { ok: true as const, raw, value: normalizeOne(provider, resourceType, raw) };
      } catch (error) {
        return { ok: false as const, raw, error };
      }
    });

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

      if (await isMaxRecordsReached(tx, jobId, resourceType, job.maxRecordsPerTask)) {
        nextUrl = null; // stop here even if the server has more pages
      }

      await tx.syncTask.update({
        where: { id: task.id },
        data: nextUrl
          ? { cursorUrl: nextUrl, status: 'RUNNING', attempts: 0, lastError: null }
          : { cursorUrl: null, status: 'COMPLETED', attempts: 0, lastError: null },
      });
    });

    log.info('clinical page done', {
      jobId,
      resourceType,
      fetched: resources.length,
      missingPatients: missingPatientCount,
      hasNextPage: nextUrl !== null,
    });
  } catch (error) {
    log.error('clinical page failed', {
      jobId,
      resourceType,
      url: task.cursorUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    await recordTaskFailure(task.id, jobId, retry, error);
    throw error; // let pg-boss apply its own tier-2 retry/backoff for this delivery
  }

  if (missingPatientCount > 0) {
    await boss.send(QUEUE_BACKFILL, { jobId });
  }

  if (nextUrl) {
    await boss.send(queueForClinicalPage(resourceType), { jobId, resourceType });
    return;
  }

  log.info('clinical task complete', { jobId, resourceType });
  await recomputeJobStatus(jobId);
}
