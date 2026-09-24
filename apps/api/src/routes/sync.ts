import { Router } from 'express';
import {
  getSyncJobDetail,
  getSyncJobs,
  postCancelSyncJob,
  postRetrySyncJob,
  postStartSync,
} from '../controllers/syncController';

export const syncRouter = Router();

syncRouter.post('/', postStartSync);
syncRouter.get('/jobs', getSyncJobs);
syncRouter.get('/jobs/:id', getSyncJobDetail);
syncRouter.post('/jobs/:id/retry', postRetrySyncJob);
syncRouter.post('/jobs/:id/cancel', postCancelSyncJob);
