import axios, { type AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

// Tier-1 retry: fast, per-HTTP-call backoff for transient failures only. Network errors, 5xx, and
// 429 are retried; any other 4xx fails immediately (retrying a malformed request wastes calls).
// A slower, per-task tier-2 retry (via the job queue, resuming from the stored page cursor) picks
// up once this is exhausted — see sync/queue.ts. Shared by every provider's client — this part of
// the retry behavior isn't vendor-specific.
export function createFhirHttpClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { Accept: 'application/fhir+json' },
  });

  axiosRetry(client, {
    retries: 3,
    retryCondition: (error) => {
      if (axiosRetry.isNetworkError(error)) return true;
      const status = error.response?.status;
      return status === 429 || (status !== undefined && status >= 500);
    },
    retryDelay: (retryCount, error) => {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (!Number.isNaN(seconds)) return seconds * 1000;
      }
      return axiosRetry.exponentialDelay(retryCount, error, 1000);
    },
  });

  return client;
}
