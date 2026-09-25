import { Prisma } from '../../../../generated/prisma';
import { getProvider } from '../fhir/providers/registry';
import { createSyncLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { boss, QUEUE_PATIENT_PAGE } from './queue';
import { RESOURCE_TYPE_PATIENT } from './resourceTypes';

const log = createSyncLogger('orchestrator');

const ACTIVE_JOB_STATUSES = ['PENDING', 'RUNNING'] as const;

export class SyncJobInProgressError extends Error {
  constructor(public readonly existingJobId: string) {
    super(`A sync job is already in progress for this source: ${existingJobId}`);
  }
}

// Watermark eligibility is `allTasksCompleted`, not `status` — a PARTIAL job (some individually
// malformed records) still fully scanned every page of the search and is a safe incremental
// checkpoint; a job where a task itself FAILED did not, and is not. See the field's doc comment
// in schema.prisma.
async function computeWatermark(source: string): Promise<Date | null> {
  const lastJob = await prisma.syncJob.findFirst({
    where: { source: source as never, allTasksCompleted: true },
    orderBy: { startedAt: 'desc' },
  });
  return lastJob?.startedAt ?? null;
}

export function buildResourceSearchUrl(
  source: string,
  resourceType: string,
  watermark: Date | null,
): string {
  return getProvider(source).buildSearchUrl(resourceType, watermark);
}

export interface StartSyncJobOptions {
  // HAPI only — 'none' forces a full sync (ignore watermark); a Date uses it directly; omitted
  // uses today's default (computeWatermark). Meaningless for other providers (Oracle's Patient
  // search never supports watermark filtering regardless), so simply ignored for them.
  watermarkOverride?: 'none' | Date;
  // HAPI only — see the field's doc comment in schema.prisma.
  maxRecordsPerTask?: number;
}

export async function startSyncJob(
  source: string,
  triggeredBy = 'manual',
  options: StartSyncJobOptions = {},
) {
  // Fast, friendly rejection path — the partial unique index (migration
  // add_one_active_job_per_source_index) is the real correctness backstop for a race between two
  // near-simultaneous requests; this check just avoids hitting that constraint in the common case.
  const existingActive = await prisma.syncJob.findFirst({
    where: { source: source as never, status: { in: [...ACTIVE_JOB_STATUSES] } },
  });
  if (existingActive) {
    throw new SyncJobInProgressError(existingActive.id);
  }

  // 'per-patient'-scoped providers (Oracle): Patient search itself can never be watermark-filtered,
  // but job.watermark also feeds buildPatientScopedSearchUrl's `_lastUpdated` filter for every
  // Condition/MedicationRequest batch — so once any such job's watermark got set from history, a
  // static sandbox would start returning zero clinical records on every later run. Force null
  // unconditionally rather than let it be reachable via computeWatermark or an override.
  const watermark =
    getProvider(source).clinicalSearchScope === 'per-patient'
      ? null
      : options.watermarkOverride === 'none'
        ? null
        : options.watermarkOverride instanceof Date
          ? options.watermarkOverride
          : await computeWatermark(source);

  let job;
  try {
    job = await prisma.$transaction(async (tx) => {
      const created = await tx.syncJob.create({
        data: {
          source: source as never,
          status: 'RUNNING',
          triggeredBy,
          watermark,
          maxRecordsPerTask: options.maxRecordsPerTask ?? null,
          startedAt: new Date(),
        },
      });
      await tx.syncTask.create({
        data: {
          jobId: created.id,
          resourceType: RESOURCE_TYPE_PATIENT,
          status: 'PENDING',
          cursorUrl: buildResourceSearchUrl(source, RESOURCE_TYPE_PATIENT, watermark),
        },
      });
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raceWinner = await prisma.syncJob.findFirst({
        where: { source: source as never, status: { in: [...ACTIVE_JOB_STATUSES] } },
      });
      throw new SyncJobInProgressError(raceWinner?.id ?? 'unknown');
    }
    throw error;
  }

  log.info('job started', {
    jobId: job.id,
    displayId: job.displayId,
    source,
    triggeredBy,
    watermark: watermark?.toISOString() ?? null,
    maxRecordsPerTask: options.maxRecordsPerTask ?? null,
  });

  await boss.send(QUEUE_PATIENT_PAGE, { jobId: job.id });

  return job;
}
