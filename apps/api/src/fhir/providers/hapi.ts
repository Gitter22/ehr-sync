import { env } from '../../config/env';
import { normalizeCondition } from '../../normalize/condition';
import { normalizeMedicationRequest } from '../../normalize/medicationRequest';
import { normalizePatient } from '../../normalize/patient';
import { createFhirHttpClient } from '../httpClient';
import { buildSearchUrl, fetchPageWith } from '../pagination';
import { createRateLimiter } from '../rateLimiter';
import type { FhirPatient, FhirResource } from '../types';
import type { FhirProvider } from './types';

const client = createFhirHttpClient(env.hapiFhirBaseUrl);
const limiter = createRateLimiter();

// The public HAPI FHIR R4 sandbox — no auth. Field mappings in normalize/*.ts were built directly
// against specs/patient-list.json, specs/conditions.json, specs/medication-requests.json (real
// `_summary=data` responses from this server).
export const hapiProvider: FhirProvider = {
  buildSearchUrl(resourceType, watermark) {
    const params: Record<string, string> = { _summary: 'data', _count: '50' };
    if (watermark) {
      params['_lastUpdated'] = `gt${watermark.toISOString()}`;
    }
    return buildSearchUrl(env.hapiFhirBaseUrl, resourceType, params);
  },

  fetchPage<T extends FhirResource>(url: string) {
    return fetchPageWith<T>(client, limiter, url);
  },

  async fetchPatientById(fhirId: string): Promise<FhirPatient> {
    const response = await limiter.schedule(() =>
      client.get<FhirPatient>(`/Patient/${fhirId}`, { params: { _summary: 'data' } }),
    );
    return response.data;
  },

  normalizePatient,
  normalizeCondition,
  normalizeMedicationRequest,
};
