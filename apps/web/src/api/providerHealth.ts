import { apiClient } from './client';

export interface ProviderHealthResult {
  status: 'ok' | 'error';
  httpStatus: number | null;
  latencyMs: number;
  message?: string;
}

// validateStatus accepts the controller's 502-on-unhealthy response too — the point of this check
// is to see the actual result (latency, HTTP status, message) even when the provider is down, not
// to have axios throw that data away as a generic request error.
export async function checkHapiHealth(): Promise<ProviderHealthResult> {
  const { data } = await apiClient.get<ProviderHealthResult>('/api/provider-health/hapi', {
    validateStatus: () => true,
  });
  return data;
}

export async function checkOracleHealth(): Promise<ProviderHealthResult> {
  const { data } = await apiClient.get<ProviderHealthResult>('/api/provider-health/oracle', {
    validateStatus: () => true,
  });
  return data;
}
