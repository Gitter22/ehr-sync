import { apiClient } from './client';
import type { EhrSource } from './patients';

export type SourceResetStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export const ACTIVE_RESET_STATUSES: SourceResetStatus[] = ['PENDING', 'RUNNING'];

export interface SourceDataCounts {
  patients: number;
  conditions: number;
  medicationRequests: number;
  rawResources: number;
  syncJobs: number;
  syncTasks: number;
  syncClinicalBatches: number;
  syncJobStats: number;
  syncJobEvents: number;
  syncMissingPatientRefs: number;
}

export interface SourceResetAudit {
  id: string;
  displayId: number;
  source: EhrSource;
  status: SourceResetStatus;
  triggeredBy: string | null;
  deleted: { counts: SourceDataCounts; syncJobDisplayIds: number[] } | null;
  errorMessage: string | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export async function fetchSourceResetPreview(source: EhrSource): Promise<SourceDataCounts> {
  const { data } = await apiClient.get<SourceDataCounts>('/api/source-reset/preview', {
    params: { source },
  });
  return data;
}

export async function fetchSourceResets(): Promise<{ resets: SourceResetAudit[] }> {
  const { data } = await apiClient.get<{ resets: SourceResetAudit[] }>('/api/source-reset');
  return data;
}

export async function requestSourceReset(
  source: EhrSource,
  confirmation: string,
): Promise<{ auditId: string; displayId: number }> {
  const { data } = await apiClient.post<{ auditId: string; displayId: number }>(
    '/api/source-reset',
    { source, confirmation },
  );
  return data;
}
