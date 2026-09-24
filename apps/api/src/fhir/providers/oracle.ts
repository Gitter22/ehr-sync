import axios from 'axios';
import { env } from '../../config/env';
import { normalizeCondition } from '../../normalize/condition';
import { normalizeMedicationRequest } from '../../normalize/medicationRequest';
import { normalizePatient } from '../../normalize/patient';
import { createFhirHttpClient } from '../httpClient';
import { buildSearchUrl, fetchPageWith } from '../pagination';
import { createRateLimiter } from '../rateLimiter';
import type { FhirPatient, FhirResource } from '../types';
import { ProviderNotConfiguredError, type FhirProvider } from './types';

// Oracle Health (Cerner) — unlike the public HAPI sandbox, this needs real credentials we don't
// have in this environment, so nothing here has been exercised against an actual server yet. It's
// structurally complete (own client, own auth, own default query params, own rate limiter) so
// plugging in real values is the only thing left; every TODO below marks something that needs
// verifying against a real sandbox response, the same way HAPI's normalize/*.ts was built against
// the specs/*.json samples.

function requireConfig() {
  const { oracleFhirBaseUrl, oracleTokenUrl, oracleClientId, oracleClientSecret } = env;
  if (!oracleFhirBaseUrl || !oracleTokenUrl || !oracleClientId || !oracleClientSecret) {
    throw new ProviderNotConfiguredError(
      'Oracle Health provider is not configured — set ORACLE_FHIR_BASE_URL, ORACLE_TOKEN_URL, ' +
        'ORACLE_CLIENT_ID, and ORACLE_CLIENT_SECRET to use source=ORACLE_HEALTH.',
    );
  }
  return { oracleFhirBaseUrl, oracleTokenUrl, oracleClientId, oracleClientSecret };
}

// Lazily constructed — module load must never throw just because Oracle isn't configured, since
// the rest of the app (and the HAPI provider) has to keep working without it.
let client: ReturnType<typeof createFhirHttpClient> | undefined;
let limiter: ReturnType<typeof createRateLimiter> | undefined;
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

// SMART-on-FHIR backend-services client-credentials grant — the standard pattern for
// system-to-system FHIR access. TODO: confirm this matches Oracle Health's actual token endpoint
// contract (grant type, scope string, credential delivery) once real sandbox access exists.
async function getAccessToken(): Promise<string> {
  const { oracleTokenUrl, oracleClientId, oracleClientSecret } = requireConfig();

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken;
  }

  const response = await axios.post<{ access_token: string; expires_in: number }>(
    oracleTokenUrl,
    new URLSearchParams({ grant_type: 'client_credentials', scope: 'system/*.read' }),
    {
      auth: { username: oracleClientId, password: oracleClientSecret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );

  cachedToken = {
    accessToken: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

function getClient() {
  if (!client) {
    const { oracleFhirBaseUrl } = requireConfig();
    client = createFhirHttpClient(oracleFhirBaseUrl);
    client.interceptors.request.use(async (config) => {
      config.headers.set('Authorization', `Bearer ${await getAccessToken()}`);
      return config;
    });
  }
  return client;
}

function getLimiter() {
  if (!limiter) limiter = createRateLimiter();
  return limiter;
}

export const oracleProvider: FhirProvider = {
  buildSearchUrl(resourceType, watermark) {
    const { oracleFhirBaseUrl } = requireConfig();
    // TODO: confirm Oracle Health's sandbox supports `_summary=data` the same way HAPI's does —
    // defaulting to just `_count` until verified against a real response, so we don't silently
    // assume a query param that gets ignored (or rejected) by a different server.
    const params: Record<string, string> = { _count: '50' };
    if (watermark) {
      params['_lastUpdated'] = `gt${watermark.toISOString()}`;
    }
    return buildSearchUrl(oracleFhirBaseUrl, resourceType, params);
  },

  fetchPage<T extends FhirResource>(url: string) {
    return fetchPageWith<T>(getClient(), getLimiter(), url);
  },

  async fetchPatientById(fhirId: string): Promise<FhirPatient> {
    const response = await getLimiter().schedule(() =>
      getClient().get<FhirPatient>(`/Patient/${fhirId}`),
    );
    return response.data;
  },

  // Patient/Condition/MedicationRequest's common fields are FHIR R4-spec-defined, so the shared
  // normalize functions are a reasonable default for any compliant server — but they're UNVERIFIED
  // against real Oracle Health responses (unlike HAPI's, built directly against specs/*.json
  // samples). Swap any of these three for an Oracle-specific implementation the moment real
  // sandbox data reveals a mapping gap; nothing else in the sync engine needs to change to do that.
  normalizePatient,
  normalizeCondition,
  normalizeMedicationRequest,
};
