import { createSyncLogger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { recomputeClinicalTaskStatus, recomputeJobStatus } from './completionCheck';
import { isFinalAttempt, type RetryContext } from './retryContext';

const log = createSyncLogger('failure');

// Called from each walk handler's catch block. Mirrors pg-boss's own retry bookkeeping onto
// SyncTask (attempts/lastError), so the job detail dialog reflects reality instead of staying
// silently stuck at whatever the task's last successful update left it at. Only flips the task to
// FAILED once this was genuinely the last delivery pg-boss will attempt — before that, the task
// stays RUNNING (pg-boss will retry it again shortly) with the failure visible via lastError.
export async function recordTaskFailure(
  taskId: string,
  jobId: string,
  retry: RetryContext,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const exhausted = isFinalAttempt(retry);

  await prisma.syncTask.update({
    where: { id: taskId },
    data: {
      attempts: retry.retryCount + 1,
      lastError: message,
      status: exhausted ? 'FAILED' : 'RUNNING',
    },
  });
  log.warn(exhausted ? 'task failed permanently' : 'task attempt failed, will retry', {
    taskId,
    jobId,
    attempt: retry.retryCount + 1,
    retryLimit: retry.retryLimit,
    error: message,
  });

  if (exhausted) {
    // The task just became terminal — nothing else will call this on its behalf, so re-run the
    // completion check ourselves (e.g. lets the job become FAILED/PARTIAL instead of sitting in
    // RUNNING forever with no active work left).
    await recomputeJobStatus(jobId);
  }
}

// Same pattern as recordTaskFailure, targeting a SyncClinicalBatch instead — used by
// 'per-patient'-scoped providers (Oracle). A batch failing never blocks its siblings (they're
// independent, unlike HAPI's sequential cursor), so this only ever needs to trigger the
// per-resource-type fan-in check, never the job-level one directly.
export async function recordBatchFailure(
  batchId: string,
  jobId: string,
  resourceType: string,
  retry: RetryContext,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const exhausted = isFinalAttempt(retry);

  await prisma.syncClinicalBatch.update({
    where: { id: batchId },
    data: {
      attempts: retry.retryCount + 1,
      lastError: message,
      status: exhausted ? 'FAILED' : 'RUNNING',
    },
  });

  if (exhausted) {
    await recomputeClinicalTaskStatus(jobId, resourceType);
  }
}
