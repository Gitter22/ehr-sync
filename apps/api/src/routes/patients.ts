import { Router } from 'express';
import {
  getPatientConditions,
  getPatientDetail,
  getPatientMedicationRequests,
  getPatients,
} from '../controllers/patientsController';

export const patientsRouter = Router();

patientsRouter.get('/', getPatients);
patientsRouter.get('/:id', getPatientDetail);
patientsRouter.get('/:id/conditions', getPatientConditions);
patientsRouter.get('/:id/medication-requests', getPatientMedicationRequests);
