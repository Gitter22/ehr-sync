import type { EhrSource } from '../../../../generated/prisma';
import { prisma } from '../lib/prisma';
import { createSyncLogger } from '../lib/logger';
import { boss, QUEUE_SOURCE_RESET } from '../sync/queue';
import { InvalidSourceError } from './syncService';

const log = createSyncLogger('reset');

// Only sources with a real integration — EPIC has nothing to wipe.
const RESETTABLE_SOURCES = new Set(['HAPI_FHIR', 'ORACLE_HEALTH']);
const ACTIVE_JOB_STATUSES = ['PENDING', 'RUNNING'] as const;
const ACTIVE_RESET_STATUSES = ['PENDING', 'RUNNING'] as const;

export class ResetConfirmationError extends Error {}
export class ResetBlockedError extends Error {}

export interface SourceDataCounts {
  patients: number;
  conditions: number;
  medicationRequests: number;
  rawResources: number;
  syncJobs: number;
  syncTasks: number;
  syncClinicalBatches: number;
  syncJobStats: number;
  syncJobEvents: number;
  syncMissingPatientRefs: number;
}

function parseSource(source: string): EhrSource {
  if (!RESETTABLE_SOURCES.has(source)) {
    throw new InvalidSourceError(`Cannot reset source: ${source}`);
  }
  return source as EhrSource;
}

// What a reset would delete right now — shown in the confirmation dialog so nobody types the
// source name without seeing what it costs.
export async function previewSourceReset(source: string): Promise<SourceDataCounts> {
  const src = parseSource(source);
  const jobScope = { job: { source: src } };
  const [
    patients,
    conditions,
    medicationRequests,
    rawResources,
    syncJobs,
    syncTasks,
    syncClinicalBatches,
    syncJobStats,
    syncJobEvents,
    syncMissingPatientRefs,
  ] = await Promise.all([
    prisma.patient.count({ where: { source: src } }),
    prisma.condition.count({ where: { source: src } }),
    prisma.medicationRequest.count({ where: { source: src } }),
    prisma.rawFhirResource.count({ where: { source: src } }),
    prisma.syncJob.count({ where: { source: src } }),
    prisma.syncTask.count({ where: jobScope }),
    prisma.syncClinicalBatch.count({ where: jobScope }),
    prisma.syncJobStat.count({ where: jobScope }),
    prisma.syncJobEvent.count({ where: jobScope }),
    prisma.syncMissingPatientRef.count({ where: { source: src } }),
  ]);
  return {
    patients,
    conditions,
    medicationRequests,
    rawResources,
    syncJobs,
    syncTasks,
    syncClinicalBatches,
    syncJobStats,
    syncJobEvents,
    syncMissingPatientRefs,
  };
}

export async function listSourceResets() {
  return prisma.sourceResetAudit.findMany({ orderBy: { requestedAt: 'desc' }, take: 20 });
}

// True while a reset is queued or running for this source — sync triggering checks it so a new job
// can't start against data that's about to be deleted.
export async function hasActiveSourceReset(source: string): Promise<boolean> {
  const active = await prisma.sourceResetAudit.findFirst({
    where: { source: source as EhrSource, status: { in: [...ACTIVE_RESET_STATUSES] } },
    select: { id: true },
  });
  return active !== null;
}

// Validates, writes the audit row, and enqueues the actual wipe — it can take a while, so the
// request returns immediately and the UI polls the audit list (same pattern as sync jobs).
//  - `confirmation` must exactly equal the source name, so a stray/scripted call can't wipe data.
//  - Refuses while a sync job is PENDING/RUNNING or another reset is queued/running for the source.
export async function requestSourceReset(
  source: string,
  confirmation: unknown,
  triggeredBy = 'manual',
) {
  const src = parseSource(source);
  if (confirmation !== source) {
    throw new ResetConfirmationError(`confirmation must exactly equal "${source}"`);
  }
  await assertNoActiveWork(src);

  const audit = await prisma.sourceResetAudit.create({ data: { source: src, triggeredBy } });
  await boss.send(QUEUE_SOURCE_RESET, { auditId: audit.id });
  log.warn('source reset requested', { auditId: audit.id, displayId: audit.displayId, source });
  return audit;
}

async function assertNoActiveWork(src: EhrSource): Promise<void> {
  const activeJob = await prisma.syncJob.findFirst({
    where: { source: src, status: { in: [...ACTIVE_JOB_STATUSES] } },
  });
  if (activeJob) {
    throw new ResetBlockedError(
      `Sync job #${activeJob.displayId} is still ${activeJob.status} for this source — cancel it and wait for it to stop before resetting`,
    );
  }
  if (await hasActiveSourceReset(src)) {
    throw new ResetBlockedError('A reset is already in progress for this source');
  }
}

// The queue worker. Idempotent — a redelivery after a crash (or a second delivery) re-runs the
// wipe safely, and an already-finished audit row is left alone. Never rethrows: a failed reset is
// recorded on the audit row for a person to see and re-trigger, not blindly retried.
export async function executeSourceReset(auditId: string): Promise<void> {
  const audit = await prisma.sourceResetAudit.findUnique({ where: { id: auditId } });
  if (!audit || (audit.status !== 'PENDING' && audit.status !== 'RUNNING')) return;

  await prisma.sourceResetAudit.update({
    where: { id: auditId },
    data: { status: 'RUNNING', startedAt: audit.startedAt ?? new Date() },
  });
  log.warn('source reset started', { auditId, displayId: audit.displayId, source: audit.source });

  try {
    const deleted = await deleteSourceData(audit.source);
    await prisma.sourceResetAudit.update({
      where: { id: auditId },
      data: { status: 'COMPLETED', deleted, finishedAt: new Date() },
    });
    log.warn('source reset completed', { auditId, source: audit.source, deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.sourceResetAudit.update({
      where: { id: auditId },
      data: { status: 'FAILED', errorMessage: message, finishedAt: new Date() },
    });
    log.error('source reset failed', { auditId, source: audit.source, error: message });
  }
}

// Everything this app holds for one source — records, raw JSON, and every sync job/task/batch/
// stat/event/missing-patient row — so it looks like that integration was never synced (the next run
// starts with no watermark, as a first-ever run). One transaction: all-or-nothing, never a
// half-wiped source. The active-job check re-runs inside it; a job created after the request-time
// check can't slip through silently, since deleting its parent SyncJob row would hit a FK
// violation and roll the whole wipe back. Stale queue messages for deleted jobs are left alone on
// purpose — every handler returns early when its job/batch row is gone, and any in-flight
// handler's write transaction includes a job-scoped FK write (stats/batch/ref), so it fails and
// rolls back instead of resurrecting rows.
async function deleteSourceData(src: EhrSource) {
  return prisma.$transaction(
    async (tx) => {
      const activeJob = await tx.syncJob.findFirst({
        where: { source: src, status: { in: [...ACTIVE_JOB_STATUSES] } },
      });
      if (activeJob) {
        throw new ResetBlockedError(
          `Sync job #${activeJob.displayId} became ${activeJob.status} before the wipe started`,
        );
      }

      const jobs = await tx.syncJob.findMany({
        where: { source: src },
        select: { displayId: true },
        orderBy: { displayId: 'asc' },
      });

      const jobScope = { job: { source: src } };
      // Children before parents — the schema has no cascading deletes.
      const conditions = (await tx.condition.deleteMany({ where: { source: src } })).count;
      const medicationRequests = (await tx.medicationRequest.deleteMany({ where: { source: src } }))
        .count;
      const syncClinicalBatches = (await tx.syncClinicalBatch.deleteMany({ where: jobScope }))
        .count;
      const syncMissingPatientRefs = (
        await tx.syncMissingPatientRef.deleteMany({ where: { source: src } })
      ).count;
      const syncJobEvents = (await tx.syncJobEvent.deleteMany({ where: jobScope })).count;
      const syncJobStats = (await tx.syncJobStat.deleteMany({ where: jobScope })).count;
      const syncTasks = (await tx.syncTask.deleteMany({ where: jobScope })).count;
      const syncJobs = (await tx.syncJob.deleteMany({ where: { source: src } })).count;
      const patients = (await tx.patient.deleteMany({ where: { source: src } })).count;
      const rawResources = (await tx.rawFhirResource.deleteMany({ where: { source: src } })).count;

      return {
        counts: {
          patients,
          conditions,
          medicationRequests,
          rawResources,
          syncJobs,
          syncTasks,
          syncClinicalBatches,
          syncJobStats,
          syncJobEvents,
          syncMissingPatientRefs,
        },
        syncJobDisplayIds: jobs.map((j) => j.displayId),
      };
    },
    { timeout: 120_000 },
  );
}
