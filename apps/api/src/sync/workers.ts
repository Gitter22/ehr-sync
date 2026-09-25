import type PgBoss from 'pg-boss';
import { executeSourceReset } from '../services/sourceResetService';
import { processBackfill } from './backfillHandler';
import { processClinicalBatch } from './clinicalBatchHandler';
import { processClinicalPage } from './clinicalWalkHandler';
import { processPatientPage } from './patientWalkHandler';
import {
  boss,
  QUEUE_BACKFILL,
  QUEUE_CONDITION_BATCH,
  QUEUE_CONDITION_PAGE,
  QUEUE_MEDICATION_BATCH,
  QUEUE_MEDICATION_PAGE,
  QUEUE_PATIENT_PAGE,
  QUEUE_SOURCE_RESET,
} from './queue';
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

interface SourceResetData {
  auditId: string;
}

interface ClinicalBatchData {
  batchId: string;
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

// Condition and MedicationRequest each get their own queue + worker loop below, so the two
// resource types make real concurrent progress instead of competing for one shared queue's single
// consumer (see queueForClinicalPage/queueForClinicalBatch's doc comment in queue.ts for why this
// is safe — every row either resource type writes is keyed by resourceType, no shared row).

export async function registerWorkers(): Promise<void> {
  await boss.work<PatientPageData>(QUEUE_PATIENT_PAGE, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await processPatientPage(job.data.jobId, retryContextOf(job));
    }
  });

  await boss.work<ClinicalPageData>(QUEUE_CONDITION_PAGE, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await processClinicalPage(job.data.jobId, job.data.resourceType, retryContextOf(job));
    }
  });

  await boss.work<ClinicalPageData>(QUEUE_MEDICATION_PAGE, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await processClinicalPage(job.data.jobId, job.data.resourceType, retryContextOf(job));
    }
  });

  await boss.work<BackfillData>(QUEUE_BACKFILL, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await processBackfill(job.data.jobId);
    }
  });

  await boss.work<ClinicalBatchData>(QUEUE_CONDITION_BATCH, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await processClinicalBatch(job.data.batchId, retryContextOf(job));
    }
  });

  await boss.work<ClinicalBatchData>(QUEUE_MEDICATION_BATCH, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await processClinicalBatch(job.data.batchId, retryContextOf(job));
    }
  });

  await boss.work<SourceResetData>(QUEUE_SOURCE_RESET, WORK_OPTIONS, async (jobs) => {
    for (const job of jobs) {
      await executeSourceReset(job.data.auditId);
    }
  });
}
