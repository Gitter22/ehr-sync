import type { NextFunction, Request, Response } from 'express';
import { checkHapiHealth, checkOracleHealth } from '../services/providerHealthService';

export async function getHapiHealth(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await checkHapiHealth();
    res.status(result.status === 'ok' ? 200 : 502).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getOracleHealth(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await checkOracleHealth();
    res.status(result.status === 'ok' ? 200 : 502).json(result);
  } catch (error) {
    next(error);
  }
}
