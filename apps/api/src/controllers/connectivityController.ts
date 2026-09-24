import type { Request, Response, NextFunction } from 'express';
import { runConnectivityCheck } from '../services/connectivityService';

export async function getConnectivityCheck(_req: Request, res: Response, next: NextFunction) {
  try {
    const report = await runConnectivityCheck();
    res.status(report.overall === 'ok' ? 200 : 502).json(report);
  } catch (error) {
    next(error);
  }
}
