import { apiClient } from './client';

export type EhrSource = 'HAPI_FHIR' | 'ORACLE_HEALTH' | 'EPIC';

export interface Patient {
  id: string;
  source: EhrSource;
  fhirId: string;
  identifierSystem: string | null;
  identifierValue: string | null;
  active: boolean | null;
  fullName: string | null;
  familyName: string | null;
  givenName: string | null;
  gender: string | null;
  birthDate: string | null;
  sourceVersionId: string | null;
  sourceLastUpdated: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Condition {
  id: string;
  source: EhrSource;
  fhirId: string;
  patientId: string;
  codeText: string | null;
  codeSystem: string | null;
  codeValue: string | null;
  clinicalStatus: string | null;
  verificationStatus: string | null;
  encounterReference: string | null;
  createdAt: string;
}

export interface MedicationRequest {
  id: string;
  source: EhrSource;
  fhirId: string;
  patientId: string;
  medicationText: string | null;
  status: string | null;
  intent: string | null;
  dosageText: string | null;
  dosageRouteText: string | null;
  encounterReference: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PatientListFilters {
  fullName?: string;
  fhirId?: string;
  source?: string;
}

export async function fetchPatients(
  filters: PatientListFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<Patient>> {
  const { data } = await apiClient.get<PaginatedResult<Patient>>('/api/patients', {
    params: { ...filters, ...pagination },
  });
  return data;
}

export async function fetchPatient(id: string): Promise<Patient> {
  const { data } = await apiClient.get<Patient>(`/api/patients/${id}`);
  return data;
}

export interface ConditionListFilters {
  codeText?: string;
  fhirId?: string;
  source?: string;
}

export async function fetchPatientConditions(
  patientId: string,
  filters: ConditionListFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<Condition>> {
  const { data } = await apiClient.get<PaginatedResult<Condition>>(
    `/api/patients/${patientId}/conditions`,
    { params: { ...filters, ...pagination } },
  );
  return data;
}

export interface MedicationRequestListFilters {
  medicationText?: string;
  fhirId?: string;
  source?: string;
}

export async function fetchPatientMedicationRequests(
  patientId: string,
  filters: MedicationRequestListFilters,
  pagination: PaginationParams,
): Promise<PaginatedResult<MedicationRequest>> {
  const { data } = await apiClient.get<PaginatedResult<MedicationRequest>>(
    `/api/patients/${patientId}/medication-requests`,
    { params: { ...filters, ...pagination } },
  );
  return data;
}
