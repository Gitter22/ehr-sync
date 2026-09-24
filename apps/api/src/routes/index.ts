import { Router } from 'express';
import { healthRouter } from './health';
import { connectivityRouter } from './connectivity';

export const router = Router();

router.use('/health', healthRouter);
router.use('/api/connectivity-check', connectivityRouter);
