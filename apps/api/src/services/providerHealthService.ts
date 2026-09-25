import axios from 'axios';
import { env } from '../config/env';

export interface ProviderHealthResult {
  status: 'ok' | 'error';
  httpStatus: number | null;
  latencyMs: number;
  message?: string;
}

// A manual, on-demand reachability ping — deliberately separate from the sync engine's fetch path
// (fhir/httpClient.ts, which layers axios-retry + a shared rate limiter on top). This is a single
// GET, no retries, no rate limiting: a person clicked a button and wants to know right now whether
// the server is up, not a resilient page-walk. `validateStatus: () => true` so a 4xx/5xx response
// is reported as-is rather than thrown as an error — a real network failure (timeout, DNS, refused
// connection) still throws and is caught below.
async function checkMetadataEndpoint(baseUrl: string): Promise<ProviderHealthResult> {
  const startedAt = Date.now();
  try {
    const response = await axios.get(`${baseUrl}/metadata`, {
      headers: { Accept: 'application/fhir+json' },
      timeout: 10_000,
      validateStatus: () => true,
    });
    const latencyMs = Date.now() - startedAt;
    const ok = response.status >= 200 && response.status < 300;
    return {
      status: ok ? 'ok' : 'error',
      httpStatus: response.status,
      latencyMs,
      message: ok ? undefined : `Unexpected status ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'error',
      httpStatus: null,
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function checkHapiHealth(): Promise<ProviderHealthResult> {
  return checkMetadataEndpoint(env.hapiFhirBaseUrl);
}

export function checkOracleHealth(): Promise<ProviderHealthResult> {
  return checkMetadataEndpoint(env.oracleFhirBaseUrl);
}
