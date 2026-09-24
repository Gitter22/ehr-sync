import { ProviderNotConfiguredError } from '../fhir/providers/types';
import { UnsupportedProviderError } from '../fhir/providers/registry';
import { prisma } from '../lib/prisma';
import { SyncJobInProgressError, startSyncJob } from '../sync/orchestrator';
import { retrySyncJob } from '../sync/retryFailedTasks';

const VALID_SOURCES = new Set(['HAPI_FHIR', 'ORACLE_HEALTH', 'EPIC']);
const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);

export class InvalidSourceError extends Error {}
export class JobNotFoundError extends Error {}
export class JobAlreadyInProgressError extends Error {
  constructor(public readonly existingJobId: string) {
    super(`A sync job is already in progress for this source: ${existingJobId}`);
  }
}
export class JobNotCancellableError extends Error {}
export class JobNotRetryableError extends Error {}

export async function triggerSync(source: string) {
  if (!VALID_SOURCES.has(source)) {
    throw new InvalidSourceError(`Unknown source: ${source}`);
  }
  try {
    return await startSyncJob(source);
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
