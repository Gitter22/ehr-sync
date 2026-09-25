import { getProvider } from '../fhir/providers/registry';
import type { FhirPatient } from '../fhir/types';
import { createSyncLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { markTaskCancelledIfNeeded } from './cancellation';
import { recomputeJobStatus } from './completionCheck';
import { dispatchClinicalBatches } from './dispatchClinicalBatches';
import { isMaxRecordsReached } from './maxRecordsGuard';
import { buildResourceSearchUrl } from './orchestrator';
import { boss, queueForClinicalPage, QUEUE_PATIENT_PAGE } from './queue';
import {
  RESOURCE_TYPE_CONDITION,
  RESOURCE_TYPE_MEDICATION_REQUEST,
  RESOURCE_TYPE_PATIENT,
} from './resourceTypes';
import type { RetryContext } from './retryContext';
import { recordTaskFailure } from './taskFailure';
import { bulkUpsertPatients, bulkUpsertRaw } from './upsert';

const log = createSyncLogger('patient');

// Processes exactly one Patient search page, then either re-enqueues itself for the next page or,
// on the last page, marks the task COMPLETED and creates+enqueues the Condition/MedicationRequest
// tasks — this is the "last patient page triggers the clinical tasks" handoff from the plan.
export async function processPatientPage(jobId: string, retry: RetryContext): Promise<void> {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (job.status === 'CANCELLED') {
    await markTaskCancelledIfNeeded(jobId, RESOURCE_TYPE_PATIENT);
    return;
  }

  const task = await prisma.syncTask.findUnique({
    where: { jobId_resourceType: { jobId, resourceType: RESOURCE_TYPE_PATIENT } },
  });
  if (!task || (task.status !== 'PENDING' && task.status !== 'RUNNING') || !task.cursorUrl) return;

  const provider = getProvider(job.source);
  log.info('fetching patient page', { jobId, source: job.source, url: task.cursorUrl });
  let nextUrl: string | null;
  try {
    const { resources, nextUrl: fetchedNextUrl } = await provider.fetchPage<FhirPatient>(
      task.cursorUrl,
    );
    nextUrl = fetchedNextUrl;

    const normalized = resources.map((raw) => {
      try {
        return { ok: true as const, raw, value: provider.normalizePatient(raw) };
      } catch (error) {
        return { ok: false as const, raw, error };
      }
    });

    await prisma.$transaction(async (tx) => {
      await bulkUpsertRaw(
        tx,
        job.source,
        RESOURCE_TYPE_PATIENT,
        jobId,
        resources.map((raw) => ({
          fhirId: raw.id,
          raw,
          sourceLastUpdated: raw.meta?.lastUpdated ? new Date(raw.meta.lastUpdated) : null,
        })),
      );

      const okItems = normalized.filter((n) => n.ok).map((n) => n.value);
      const { created, updated } = await bulkUpsertPatients(tx, job.source, okItems);

      const failedItems = normalized.filter((n) => !n.ok);
      if (failedItems.length > 0) {
        await tx.syncJobEvent.createMany({
          data: failedItems.map((n) => ({
            jobId,
            level: 'warn',
            message: `Failed to normalize Patient ${n.raw.id}`,
            context: { error: n.error instanceof Error ? n.error.message : String(n.error) },
          })),
        });
      }

      await tx.syncJobStat.upsert({
        where: { jobId_resourceType: { jobId, resourceType: RESOURCE_TYPE_PATIENT } },
        create: {
          jobId,
          resourceType: RESOURCE_TYPE_PATIENT,
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

      if (await isMaxRecordsReached(tx, jobId, RESOURCE_TYPE_PATIENT, job.maxRecordsPerTask)) {
        nextUrl = null; // stop here even if the server has more pages
      }

      await tx.syncTask.update({
        where: { id: task.id },
        data: nextUrl
          ? { cursorUrl: nextUrl, status: 'RUNNING', attempts: 0, lastError: null }
          : { cursorUrl: null, status: 'COMPLETED', attempts: 0, lastError: null },
      });
    });

    log.info('patient page done', {
      jobId,
      fetched: resources.length,
      hasNextPage: nextUrl !== null,
    });
  } catch (error) {
    log.error('patient page failed', {
      jobId,
      url: task.cursorUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    await recordTaskFailure(task.id, jobId, retry, error);
    throw error; // let pg-boss apply its own tier-2 retry/backoff for this delivery
  }

  if (nextUrl) {
    await boss.send(QUEUE_PATIENT_PAGE, { jobId });
    return;
  }

  log.info('patient walk complete', { jobId, source: job.source });
  await onPatientWalkComplete(jobId, job.source, job.watermark);
}

async function onPatientWalkComplete(
  jobId: string,
  source: string,
  watermark: Date | null,
): Promise<void> {
  const provider = getProvider(source);

  if (provider.clinicalSearchScope === 'per-patient') {
    log.info('dispatching per-patient clinical batches', { jobId, source });
    await dispatchClinicalBatches(jobId);
    await recomputeJobStatus(jobId);
    return;
  }

  for (const resourceType of [RESOURCE_TYPE_CONDITION, RESOURCE_TYPE_MEDICATION_REQUEST] as const) {
    // Idempotent: if a duplicate delivery re-runs this after the tasks were already created,
    // skip rather than error or duplicate.
    const existing = await prisma.syncTask.findUnique({
      where: { jobId_resourceType: { jobId, resourceType } },
    });
    if (existing) continue;

    await prisma.syncTask.create({
      data: {
        jobId,
        resourceType,
        status: 'PENDING',
        cursorUrl: buildResourceSearchUrl(source, resourceType, watermark),
      },
    });
    log.info('clinical task created', { jobId, resourceType });
    await boss.send(queueForClinicalPage(resourceType), { jobId, resourceType });
  }

  await recomputeJobStatus(jobId);
}
