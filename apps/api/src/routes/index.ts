import { Router } from 'express';
import { healthRouter } from './health';
import { connectivityRouter } from './connectivity';
import { syncRouter } from './sync';

export const router = Router();

router.use('/health', healthRouter);
router.use('/api/connectivity-check', connectivityRouter);
router.use('/api/sync', syncRouter);
