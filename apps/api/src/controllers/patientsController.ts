import type { NextFunction, Request, Response } from 'express';
import {
  PatientNotFoundError,
  getPatientById,
  listConditionsForPatient,
  listMedicationRequestsForPatient,
  listPatients,
  parsePagination,
} from '../services/patientsService';

export async function getPatients(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listPatients(
      {
        fullName: typeof req.query.fullName === 'string' ? req.query.fullName : undefined,
        fhirId: typeof req.query.fhirId === 'string' ? req.query.fhirId : undefined,
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
      },
      parsePagination(req.query as Record<string, unknown>),
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getPatientDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const patient = await getPatientById(String(req.params.id));
    res.json(patient);
  } catch (error) {
    if (error instanceof PatientNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export async function getPatientConditions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listConditionsForPatient(
      String(req.params.id),
      {
        codeText: typeof req.query.codeText === 'string' ? req.query.codeText : undefined,
        fhirId: typeof req.query.fhirId === 'string' ? req.query.fhirId : undefined,
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
      },
      parsePagination(req.query as Record<string, unknown>),
    );
    res.json(result);
  } catch (error) {
    if (error instanceof PatientNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}

export async function getPatientMedicationRequests(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await listMedicationRequestsForPatient(
      String(req.params.id),
      {
        medicationText:
          typeof req.query.medicationText === 'string' ? req.query.medicationText : undefined,
        fhirId: typeof req.query.fhirId === 'string' ? req.query.fhirId : undefined,
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
      },
      parsePagination(req.query as Record<string, unknown>),
    );
    res.json(result);
  } catch (error) {
    if (error instanceof PatientNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
}
