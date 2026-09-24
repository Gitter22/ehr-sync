import PgBoss from 'pg-boss';
import { env } from '../config/env';

// The only backend-specific module for the sync job queue — see the sync engine plan's
// "Queue backend" section. Swapping to BullMQ+Redis later only touches this file.
export const QUEUE_PATIENT_PAGE = 'sync:patient-page';
export const QUEUE_CLINICAL_PAGE = 'sync:clinical-page';
export const QUEUE_BACKFILL = 'sync:backfill';

const QUEUES = [QUEUE_PATIENT_PAGE, QUEUE_CLINICAL_PAGE, QUEUE_BACKFILL];

export const boss = new PgBoss({ connectionString: env.databaseUrl });

let started = false;

export async function startQueue(): Promise<void> {
  if (started) return;
  boss.on('error', (error) => console.error('[pg-boss] error', error));
  await boss.start();
  for (const name of QUEUES) {
    // Tier-2 retry: once a page fetch's tier-1 (per-call) backoff is exhausted, pg-boss retries
    // the same task a handful more times, more slowly, before it's marked FAILED.
    await boss.createQueue(name, { name, retryLimit: 5, retryDelay: 30, retryBackoff: true });
  }
  started = true;
}

export async function stopQueue(): Promise<void> {
  if (!started) return;
  await boss.stop({ graceful: true });
  started = false;
}
