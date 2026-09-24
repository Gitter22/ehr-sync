import { apiClient } from './client';
import type { EhrSource } from './patients';

export type { EhrSource };

export type SyncJobStatus =
  'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'CANCELLED';
export type SyncTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface SyncTask {
  id: string;
  jobId: string;
  resourceType: string;
  cursorUrl: string | null;
  status: SyncTaskStatus;
  attempts: number;
  lastError: string | null;
  updatedAt: string;
}

export interface SyncJobStat {
  id: string;
  jobId: string;
  resourceType: string;
  fetched: number;
  created: number;
  updated: number;
  failed: number;
}

export interface SyncJobEvent {
  id: string;
  jobId: string;
  level: string;
  message: string;
  context: unknown;
  createdAt: string;
}

export interface SyncMissingPatientRef {
  id: string;
  jobId: string;
  source: EhrSource;
  patientFhirId: string;
  status: 'PENDING' | 'RESOLVED' | 'FAILED';
  discoveredAt: string;
  resolvedAt: string | null;
}

export interface SyncJob {
  id: string;
  displayId: number;
  source: EhrSource;
  status: SyncJobStatus;
  triggeredBy: string | null;
  watermark: string | null;
  allTasksCompleted: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  tasks: SyncTask[];
  stats: SyncJobStat[];
}

export interface SyncJobDetail extends SyncJob {
  events: SyncJobEvent[];
  missingPatients: SyncMissingPatientRef[];
}

export const ACTIVE_JOB_STATUSES: SyncJobStatus[] = ['PENDING', 'RUNNING'];

export async function startSync(source: EhrSource): Promise<{ jobId: string; displayId: number }> {
  const { data } = await apiClient.post<{ jobId: string; displayId: number }>('/api/sync', {
    source,
  });
  return data;
}

export async function fetchSyncJobs(): Promise<{ jobs: SyncJob[] }> {
  const { data } = await apiClient.get<{ jobs: SyncJob[] }>('/api/sync/jobs');
  return data;
}

export async function fetchSyncJobDetail(jobId: string): Promise<SyncJobDetail> {
  const { data } = await apiClient.get<SyncJobDetail>(`/api/sync/jobs/${jobId}`);
  return data;
}

export async function retrySyncJob(
  jobId: string,
): Promise<{ retriedTasks: number; retriedMissingPatients: number }> {
  const { data } = await apiClient.post(`/api/sync/jobs/${jobId}/retry`);
  return data;
}

export async function cancelSyncJob(jobId: string): Promise<{ cancelled: true }> {
  const { data } = await apiClient.post(`/api/sync/jobs/${jobId}/cancel`);
  return data;
}
