import type { NextFunction, Request, Response } from 'express';
import {
  InvalidSourceError,
  InvalidSyncOptionsError,
  JobAlreadyInProgressError,
  JobNotCancellableError,
  JobNotFoundError,
  JobNotRetryableError,
  cancelSync,
  getSyncJob,
  listSyncJobs,
  retrySync,
  triggerSync,
  type TriggerSyncInput,
} from '../services/syncService';

export async function postStartSync(req: Request, res: Response, next: NextFunction) {
  try {
    const source = typeof req.body?.source === 'string' ? req.body.source : undefined;
    if (!source) {
      res.status(400).json({ error: 'body.source is required' });
      return;
    }

    const lastUpdatedOverride = req.body?.lastUpdatedOverride;
    if (
      lastUpdatedOverride !== undefined &&
      lastUpdatedOverride !== null &&
      typeof lastUpdatedOverride !== 'string'
    ) {
      res
        .status(400)
        .json({ error: 'body.lastUpdatedOverride must be a string, null, or omitted' });
      return;
    }
    const maxRecords = req.body?.maxRecords;
    if (maxRecords !== undefined && typeof maxRecords !== 'number') {
      res.status(400).json({ error: 'body.maxRecords must be a number or omitted' });
      return;
    }
    const input: TriggerSyncInput = { lastUpdatedOverride, maxRecords };

    const job = await triggerSync(source, input);
    res.status(202).json({ jobId: job.id, displayId: job.displayId });
  } catch (error) {
    if (error instanceof InvalidSourceError || error instanceof InvalidSyncOptionsError) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof JobAlreadyInProgressError) {
      res.status(409).json({ error: error.message, jobId: error.existingJobId });
      return;
    }
    next(error);
  }
}

export async function getSyncJobs(_req: Request, res: Response, next: NextFunction) {
  try {
    const jobs = await listSyncJobs();
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
}

export async function getSyncJobDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await getSyncJob(String(req.params.id));
    res.json(job);
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export async function postRetrySyncJob(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await retrySync(String(req.params.id));
    res.json(result);
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof JobNotRetryableError) {
      res.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export async function postCancelSyncJob(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cancelSync(String(req.params.id));
    res.json(result);
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof JobNotCancellableError) {
      res.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
}
