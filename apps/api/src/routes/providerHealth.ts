import { Router } from 'express';
import { getHapiHealth, getOracleHealth } from '../controllers/providerHealthController';

export const providerHealthRouter = Router();

providerHealthRouter.get('/hapi', getHapiHealth);
providerHealthRouter.get('/oracle', getOracleHealth);
