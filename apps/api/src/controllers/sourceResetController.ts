import type { NextFunction, Request, Response } from 'express';
import {
  ResetBlockedError,
  ResetConfirmationError,
  listSourceResets,
  previewSourceReset,
  requestSourceReset,
} from '../services/sourceResetService';
import { InvalidSourceError } from '../services/syncService';

function handleKnownErrors(error: unknown, res: Response): boolean {
  if (error instanceof InvalidSourceError || error instanceof ResetConfirmationError) {
    res.status(400).json({ error: error.message });
    return true;
  }
  if (error instanceof ResetBlockedError) {
    res.status(409).json({ error: error.message });
    return true;
  }
  return false;
}

export async function getSourceResetPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const source = typeof req.query.source === 'string' ? req.query.source : '';
    res.json(await previewSourceReset(source));
  } catch (error) {
    if (!handleKnownErrors(error, res)) next(error);
  }
}

export async function getSourceResets(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ resets: await listSourceResets() });
  } catch (error) {
    next(error);
  }
}

export async function postSourceReset(req: Request, res: Response, next: NextFunction) {
  try {
    const source = typeof req.body?.source === 'string' ? req.body.source : '';
    const audit = await requestSourceReset(source, req.body?.confirmation);
    res.status(202).json({ auditId: audit.id, displayId: audit.displayId });
  } catch (error) {
    if (!handleKnownErrors(error, res)) next(error);
  }
}
