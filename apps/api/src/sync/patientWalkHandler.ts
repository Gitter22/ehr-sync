import { fetchPage } from '../fhir/pagination';
import type { FhirPatient } from '../fhir/types';
import { prisma } from '../lib/prisma';
import { normalizePatient } from '../normalize/patient';
import { markTaskCancelledIfNeeded } from './cancellation';
import { recomputeJobStatus } from './completionCheck';
import { buildResourceSearchUrl } from './orchestrator';
import { boss, QUEUE_CLINICAL_PAGE, QUEUE_PATIENT_PAGE } from './queue';
import {
  RESOURCE_TYPE_CONDITION,
  RESOURCE_TYPE_MEDICATION_REQUEST,
  RESOURCE_TYPE_PATIENT,
} from './resourceTypes';
import { bulkUpsertPatients, bulkUpsertRaw } from './upsert';

// Processes exactly one Patient search page, then either re-enqueues itself for the next page or,
// on the last page, marks the task COMPLETED and creates+enqueues the Condition/MedicationRequest
// tasks — this is the "last patient page triggers the clinical tasks" handoff from the plan.
export async function processPatientPage(jobId: string): Promise<void> {
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

  const { resources, nextUrl } = await fetchPage<FhirPatient>(task.cursorUrl);

  const normalized = resources.map((raw) => {
    try {
      return { ok: true as const, raw, value: normalizePatient(raw) };
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

    await tx.syncTask.update({
      where: { id: task.id },
      data: nextUrl
        ? { cursorUrl: nextUrl, status: 'RUNNING' }
        : { cursorUrl: null, status: 'COMPLETED' },
    });
  });

  if (nextUrl) {
    await boss.send(QUEUE_PATIENT_PAGE, { jobId });
    return;
  }

  await onPatientWalkComplete(jobId, job.watermark);
}

async function onPatientWalkComplete(jobId: string, watermark: Date | null): Promise<void> {
  for (const resourceType of [RESOURCE_TYPE_CONDITION, RESOURCE_TYPE_MEDICATION_REQUEST]) {
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
        cursorUrl: buildResourceSearchUrl(resourceType, watermark),
      },
    });
    await boss.send(QUEUE_CLINICAL_PAGE, { jobId, resourceType });
  }

  await recomputeJobStatus(jobId);
}
