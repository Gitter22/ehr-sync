import PgBoss from 'pg-boss';
import { env } from '../config/env';

// The only backend-specific module for the sync job queue — see the sync engine plan's
// "Queue backend" section. Swapping to BullMQ+Redis later only touches this file.
export const QUEUE_PATIENT_PAGE = 'sync:patient-page';
export const QUEUE_CLINICAL_PAGE = 'sync:clinical-page';
export const QUEUE_BACKFILL = 'sync:backfill';
// 'per-patient'-scoped providers (Oracle) only — one shared queue for both Condition and
// MedicationRequest batches for now; split alongside QUEUE_CLINICAL_PAGE in a later pass.
export const QUEUE_CLINICAL_BATCH = 'sync:clinical-batch';

const QUEUES = [QUEUE_PATIENT_PAGE, QUEUE_CLINICAL_PAGE, QUEUE_BACKFILL, QUEUE_CLINICAL_BATCH];

export const boss = new PgBoss({ connectionString: env.databaseUrl });

let started = false;

export async function startQueue(): Promise<void> {
  if (started) return;
  boss.on('error', (error) => console.error('[pg-boss] error', error));
  await boss.start();
  // Tier-2 retry: once a page fetch's tier-1 (per-call) backoff is exhausted, pg-boss retries the
  // same task a couple more times, more slowly, before it's marked FAILED. With retryBackoff,
  // delay before retry N is ~15 * 2^(N) seconds (jittered): ~30-60s, ~1-2min for retries 1-2 —
  // cumulative ~1.5-3min elapsed before the task is marked FAILED.
  const retryConfig = { retryLimit: 2, retryDelay: 30, retryBackoff: true };
  for (const name of QUEUES) {
    // createQueue is a no-op (ON CONFLICT DO NOTHING) if the queue already exists from a previous
    // run — updateQueue is what actually applies retryConfig on every boot, so changing these
    // values in code takes effect on restart even against a database that already has the queue.
    await boss.createQueue(name, { name, ...retryConfig });
    await boss.updateQueue(name, { name, ...retryConfig });
  }
  started = true;
}

export async function stopQueue(): Promise<void> {
  if (!started) return;
  await boss.stop({ graceful: true });
  started = false;
}
