// pg-boss's own retry bookkeeping for the current delivery of a queue job — passed down from
// workers.ts (which reads it off pg-boss's JobWithMetadata) into the walk handlers, so they can
// mirror it onto SyncTask.attempts/lastError instead of tracking retries separately.
export interface RetryContext {
  retryCount: number;
  retryLimit: number;
}

// True once this delivery is the last one pg-boss will attempt — if it also fails, pg-boss marks
// the underlying queue job permanently failed and will not retry again.
export function isFinalAttempt(retry: RetryContext): boolean {
  return retry.retryCount >= retry.retryLimit;
}
