import type { FetchPageResult } from '../fhir/pagination';
import { getProvider } from '../fhir/providers/registry';
import type { FhirProvider } from '../fhir/providers/types';
import type { FhirCondition, FhirMedicationRequest, FhirResource } from '../fhir/types';
import { createSyncLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import type { NormalizedCondition } from '../normalize/condition';
import type { NormalizedMedicationRequest } from '../normalize/medicationRequest';
import { markBatchCancelledIfNeeded } from './cancellation';
import { recomputeClinicalTaskStatus } from './completionCheck';
import { RESOURCE_TYPE_CONDITION, type ClinicalResourceType } from './resourceTypes';
import type { RetryContext } from './retryContext';
import { recordBatchFailure } from './taskFailure';
import {
  bulkUpsertConditions,
  bulkUpsertMedicationRequests,
  bulkUpsertRaw,
  resolvePatientIds,
} from './upsert';

const log = createSyncLogger('batch');

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

// Only used by 'per-patient'-scoped providers (Oracle). Processes one SyncClinicalBatch entirely —
// every patient in its (small, fixed) patientFhirIds list, walking each patient's own pagination
// to exhaustion — and commits everything in one transaction at the end. No cursor *within* the
// batch: a retry re-does the whole thing, which is cheap and idempotent at this batch size (~10
// patients). See the plan's "New handler" section for why this granularity was chosen.
export async function processClinicalBatch(batchId: string, retry: RetryContext): Promise<void> {
  const batch = await prisma.syncClinicalBatch.findUnique({ where: { id: batchId } });
  if (!batch) return;

  const job = await prisma.syncJob.findUnique({ where: { id: batch.jobId } });
  if (!job) return;

  if (job.status === 'CANCELLED') {
    await markBatchCancelledIfNeeded(batchId);
    return;
  }

  if (batch.status !== 'PENDING' && batch.status !== 'RUNNING') return;

  const provider = getProvider(job.source);
  const resourceType = batch.resourceType as ClinicalResourceType;

  log.info('batch started', {
    batchId,
    jobId: job.id,
    resourceType,
    batchIndex: batch.batchIndex,
    patientCount: batch.patientFhirIds.length,
  });

  try {
    await prisma.syncClinicalBatch.update({ where: { id: batchId }, data: { status: 'RUNNING' } });

    // Fetched in parallel across the batch's ~10 patients (not "batched" in the API sense — Oracle
    // rejects that — but concurrent queue-level work), bounded by the shared per-provider rate
    // limiter the same way any other concurrent calls are, so this doesn't increase real request
    // rate — it just removes an unnecessary extra layer of serialization on top of that limiter.
    // Running these sequentially was the direct cause of a batch's cumulative wall-clock time
    // occasionally exceeding pg-boss's job expiration window under slow server conditions.
    const resourcesById = new Map<string, FhirResource>();
    await Promise.all(
      batch.patientFhirIds.map(async (patientFhirId) => {
        let url: string | null = provider.buildPatientScopedSearchUrl(
          resourceType,
          patientFhirId,
          job.watermark,
        );
        let pageCount = 0;
        while (url) {
          const page: FetchPageResult<FhirResource> = await provider.fetchPage<FhirResource>(url);
          pageCount += 1;
          // Oracle's pagination can return the same record on more than one page (confirmed for
          // Patient search; nothing rules it out here either) — a single bulk upsert statement
          // covering this whole batch can't contain the same conflict key twice (Postgres: "ON
          // CONFLICT DO UPDATE command cannot affect row a second time"), so dedupe by id up
          // front rather than let that fail the whole batch deterministically on every retry.
          // Map.set() is safe to call from multiple concurrent branches here — JS's single
          // threaded event loop means each call runs to completion atomically, no locking needed.
          for (const resource of page.resources) {
            resourcesById.set(resource.id, resource);
          }
          url = page.nextUrl;
        }
        log.info('patient fetched', { batchId, resourceType, patientFhirId, pageCount });
      }),
    );
    const resources = [...resourcesById.values()];

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
        job.id,
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
      // Every patient id in this batch came from the already-COMPLETED Patient task, so this
      // should never happen — the missing-patient/backfill mechanism doesn't apply here at all
      // (see the plan). Log loudly rather than silently drop data if the invariant is ever broken.
      const unexpectedlyMissing = okItems.filter((i) => !patientIdMap.has(i.patientFhirId));

      const { created, updated } =
        resourceType === RESOURCE_TYPE_CONDITION
          ? await bulkUpsertConditions(tx, job.source, ready as never)
          : await bulkUpsertMedicationRequests(tx, job.source, ready as never);

      const failedItems = normalized.filter((n) => !n.ok);
      const events = [
        ...failedItems.map((n) => ({
          jobId: job.id,
          level: 'warn',
          message: `Failed to normalize ${resourceType} ${n.raw.id}`,
          context: { error: n.error instanceof Error ? n.error.message : String(n.error) },
        })),
        ...unexpectedlyMissing.map((i) => ({
          jobId: job.id,
          level: 'error',
          message: `Batch ${batchId}: patient ${i.patientFhirId} unexpectedly not found locally for ${resourceType} ${i.fhirId}`,
        })),
      ];
      if (events.length > 0) {
        await tx.syncJobEvent.createMany({ data: events });
      }

      await tx.syncJobStat.upsert({
        where: { jobId_resourceType: { jobId: job.id, resourceType } },
        create: {
          jobId: job.id,
          resourceType,
          fetched: resources.length,
          created,
          updated,
          failed: failedItems.length + unexpectedlyMissing.length,
        },
        update: {
          fetched: { increment: resources.length },
          created: { increment: created },
          updated: { increment: updated },
          failed: { increment: failedItems.length + unexpectedlyMissing.length },
        },
      });

      await tx.syncClinicalBatch.update({
        where: { id: batchId },
        data: { status: 'COMPLETED', attempts: 0, lastError: null },
      });
    });

    log.info('batch done', {
      batchId,
      jobId: job.id,
      resourceType,
      fetched: resources.length,
    });
  } catch (error) {
    log.error('batch failed', {
      batchId,
      jobId: job.id,
      resourceType,
      attempt: retry.retryCount + 1,
      retryLimit: retry.retryLimit,
      error: error instanceof Error ? error.message : String(error),
    });
    await recordBatchFailure(batchId, job.id, resourceType, retry, error);
    throw error; // let pg-boss apply its own tier-2 retry/backoff for this delivery
  }

  await recomputeClinicalTaskStatus(job.id, resourceType);
}
