import { prisma } from '../lib/prisma';

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export class PatientNotFoundError extends Error {}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

export function parsePagination(query: Record<string, unknown>): Pagination {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
  );
  return { page, pageSize };
}

function contains(value: unknown): { contains: string; mode: 'insensitive' } | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return { contains: value.trim(), mode: 'insensitive' };
}

export interface PatientListFilters {
  fullName?: string;
  fhirId?: string;
  source?: string;
}

export async function listPatients(
  filters: PatientListFilters,
  pagination: Pagination,
): Promise<PaginatedResult<Awaited<ReturnType<typeof prisma.patient.findFirst>>>> {
  const where = {
    ...(contains(filters.fullName) ? { fullName: contains(filters.fullName) } : {}),
    ...(contains(filters.fhirId) ? { fhirId: contains(filters.fhirId) } : {}),
    ...(filters.source ? { source: filters.source as never } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.patient.count({ where }),
  ]);

  return { rows, total, page: pagination.page, pageSize: pagination.pageSize };
}

export async function getPatientById(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    throw new PatientNotFoundError(`Patient not found: ${id}`);
  }
  return patient;
}

export interface ConditionListFilters {
  codeText?: string;
  fhirId?: string;
  source?: string;
}

export async function listConditionsForPatient(
  patientId: string,
  filters: ConditionListFilters,
  pagination: Pagination,
) {
  await getPatientById(patientId);

  const where = {
    patientId,
    ...(contains(filters.codeText) ? { codeText: contains(filters.codeText) } : {}),
    ...(contains(filters.fhirId) ? { fhirId: contains(filters.fhirId) } : {}),
    ...(filters.source ? { source: filters.source as never } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.condition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.condition.count({ where }),
  ]);

  return { rows, total, page: pagination.page, pageSize: pagination.pageSize };
}

export interface MedicationRequestListFilters {
  medicationText?: string;
  fhirId?: string;
  source?: string;
}

export async function listMedicationRequestsForPatient(
  patientId: string,
  filters: MedicationRequestListFilters,
  pagination: Pagination,
) {
  await getPatientById(patientId);

  const where = {
    patientId,
    ...(contains(filters.medicationText)
      ? { medicationText: contains(filters.medicationText) }
      : {}),
    ...(contains(filters.fhirId) ? { fhirId: contains(filters.fhirId) } : {}),
    ...(filters.source ? { source: filters.source as never } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.medicationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.medicationRequest.count({ where }),
  ]);

  return { rows, total, page: pagination.page, pageSize: pagination.pageSize };
}
