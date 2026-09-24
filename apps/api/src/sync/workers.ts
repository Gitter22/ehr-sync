import type PgBoss from 'pg-boss';
import { processBackfill } from './backfillHandler';
import { processClinicalPage } from './clinicalWalkHandler';
import { processPatientPage } from './patientWalkHandler';
import { boss, QUEUE_BACKFILL, QUEUE_CLINICAL_PAGE, QUEUE_PATIENT_PAGE } from './queue';
import type { ClinicalResourceType } from './resourceTypes';
import type { RetryContext } from './retryContext';

interface PatientPageData {
  jobId: string;
}

interface ClinicalPageData {
  jobId: string;
  resourceType: ClinicalResourceType;
}

interface BackfillData {
  jobId: string;
}

// One job at a time per queue — each handler already processes exactly one page (or drains one
// job's backfill queue) and re-enqueues itself for the next unit of work, rather than looping
// internally, so there's no benefit to batching deliveries here. includeMetadata gives handlers
// pg-boss's own retryCount/retryLimit for this delivery, so SyncTask.attempts/lastError can
// mirror pg-boss's real retry bookkeeping instead of maintaining a separate, driftable counter.
const WORK_OPTIONS: PgBoss.WorkOptions & { includeMetadata: true } = {
  batchSize: 1,
  includeMetadata: true,
};

function retryContextOf(job: { retryCount: number; retryLimit: number }): RetryContext {
  return { retryCount: job.retryCount, retryLimit: job.retryLimit };
}

export async function registerWorkers(): Promise<void> {
  await boss.work<PatientPageData>(QUEUE_PATIENT_PAGE, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await processPatientPage(job.data.jobId, retryContextOf(job));
    }
  });

  await boss.work<ClinicalPageData>(QUEUE_CLINICAL_PAGE, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await processClinicalPage(job.data.jobId, job.data.resourceType, retryContextOf(job));
    }
  });

  await boss.work<BackfillData>(QUEUE_BACKFILL, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await processBackfill(job.data.jobId);
    }
  });
}
