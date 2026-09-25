import { apiClient } from './client';

export interface ConnectivityReport {
  api: { status: string; database: string; message?: string };
  overall: 'ok' | 'error';
}

export async function runConnectivityCheck(): Promise<ConnectivityReport> {
  const { data } = await apiClient.post<ConnectivityReport>('/api/connectivity-check');
  return data;
}
