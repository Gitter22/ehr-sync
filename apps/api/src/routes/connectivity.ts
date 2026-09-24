import { Router } from 'express';
import { getConnectivityCheck } from '../controllers/connectivityController';

export const connectivityRouter = Router();

connectivityRouter.post('/', getConnectivityCheck);
