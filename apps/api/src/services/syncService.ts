import { ProviderNotConfiguredError } from '../fhir/providers/types';
import { UnsupportedProviderError } from '../fhir/providers/registry';
import { prisma } from '../lib/prisma';
import {
  SyncJobInProgressError,
  startSyncJob,
  type StartSyncJobOptions,
} from '../sync/orchestrator';
import { retrySyncJob } from '../sync/retryFailedTasks';

const VALID_SOURCES = new Set(['HAPI_FHIR', 'ORACLE_HEALTH', 'EPIC']);
const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);
// maxRecords caps the Patient task's record count for any provider — for 'per-patient'-scoped
// providers (Oracle) this also proportionally shrinks the downstream Condition/MedicationRequest
// batches, since those are only ever created for patients actually synced this job.
const SOURCES_SUPPORTING_MAX_RECORDS = new Set(['HAPI_FHIR', 'ORACLE_HEALTH']);
// lastUpdatedOverride stays HAPI-only — Oracle's Patient search never supports watermark filtering
// regardless, and orchestrator.startSyncJob now forces watermark=null unconditionally for
// 'per-patient'-scoped providers, so this would be silently moot for Oracle anyway.
const SOURCES_SUPPORTING_LAST_UPDATED_OVERRIDE = new Set(['HAPI_FHIR']);

export class InvalidSourceError extends Error {}
export class InvalidSyncOptionsError extends Error {}
export class JobNotFoundError extends Error {}
export class JobAlreadyInProgressError extends Error {
  constructor(public readonly existingJobId: string) {
    super(`A sync job is already in progress for this source: ${existingJobId}`);
  }
}
export class JobNotCancellableError extends Error {}
export class JobNotRetryableError extends Error {}

export interface TriggerSyncInput {
  // Field absent -> undefined -> today's default (last successful job's startedAt). Explicit
  // `null` -> force a full sync. An ISO date string -> use that date as the watermark directly.
  lastUpdatedOverride?: string | null;
  maxRecords?: number;
}

function toStartSyncJobOptions(source: string, input: TriggerSyncInput): StartSyncJobOptions {
  const options: StartSyncJobOptions = {};

  if (SOURCES_SUPPORTING_LAST_UPDATED_OVERRIDE.has(source)) {
    if (input.lastUpdatedOverride === null) {
      options.watermarkOverride = 'none';
    } else if (typeof input.lastUpdatedOverride === 'string') {
      const parsed = new Date(input.lastUpdatedOverride);
      if (Number.isNaN(parsed.getTime())) {
        throw new InvalidSyncOptionsError(
          `Invalid lastUpdatedOverride date: ${input.lastUpdatedOverride}`,
        );
      }
      options.watermarkOverride = parsed;
    }
  }

  if (SOURCES_SUPPORTING_MAX_RECORDS.has(source) && input.maxRecords !== undefined) {
    if (!Number.isInteger(input.maxRecords) || input.maxRecords <= 0) {
      throw new InvalidSyncOptionsError('maxRecords must be a positive integer');
    }
    options.maxRecordsPerTask = input.maxRecords;
  }

  return options;
}

export async function triggerSync(source: string, input: TriggerSyncInput = {}) {
  if (!VALID_SOURCES.has(source)) {
    throw new InvalidSourceError(`Unknown source: ${source}`);
  }
  const options = toStartSyncJobOptions(source, input);
  try {
    return await startSyncJob(source, 'manual', options);
  } catch (error) {
    if (error instanceof SyncJobInProgressError) {
      throw new JobAlreadyInProgressError(error.existingJobId);
    }
    if (error instanceof UnsupportedProviderError || error instanceof ProviderNotConfiguredError) {
      throw new InvalidSourceError(error.message);
    }
    throw error;
  }
}

export async function listSyncJobs() {
  return prisma.syncJob.findMany({
    orderBy: { createdAt: 'desc' },
    include: { stats: true, tasks: true },
    take: 50,
  });
}

export async function getSyncJob(jobId: string) {
  const job = await prisma.syncJob.findUnique({
    where: { id: jobId },
    include: {
      tasks: true,
      stats: true,
      events: { orderBy: { createdAt: 'desc' }, take: 200 },
      missingPatients: true,
    },
  });
  if (!job) {
    throw new JobNotFoundError(`Sync job not found: ${jobId}`);
  }
  return job;
}

export async function retrySync(jobId: string) {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new JobNotFoundError(`Sync job not found: ${jobId}`);
  }
  if (job.status === 'CANCELLED') {
    throw new JobNotRetryableError(`Job ${jobId} was cancelled — start a new sync instead`);
  }
  return retrySyncJob(jobId);
}

export async function cancelSync(jobId: string) {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new JobNotFoundError(`Sync job not found: ${jobId}`);
  }
  if (!ACTIVE_STATUSES.has(job.status)) {
    throw new JobNotCancellableError(`Job ${jobId} is already ${job.status}`);
  }
  await prisma.syncJob.update({
    where: { id: jobId },
    data: { status: 'CANCELLED', finishedAt: new Date() },
  });
  return { cancelled: true };
}
