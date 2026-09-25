import { Router } from 'express';
import {
  getSourceResetPreview,
  getSourceResets,
  postSourceReset,
} from '../controllers/sourceResetController';

export const sourceResetRouter = Router();

sourceResetRouter.get('/', getSourceResets);
sourceResetRouter.get('/preview', getSourceResetPreview);
sourceResetRouter.post('/', postSourceReset);
