import { env } from '../../config/env';
import { normalizeCondition } from '../../normalize/condition';
import { normalizeMedicationRequest } from '../../normalize/medicationRequest';
import { normalizePatient } from '../../normalize/patient';
import { createFhirHttpClient } from '../httpClient';
import { buildSearchUrl, fetchPageWith } from '../pagination';
import { createRateLimiter } from '../rateLimiter';
import type { FhirPatient, FhirResource } from '../types';
import type { FhirProvider } from './types';

// Oracle Health (Cerner) public "open sandbox" — verified live against
// https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d during planning, not just
// inferred from docs:
//   - No auth: every call below succeeds with only an Accept header.
//   - Patient search has NO unscoped listing — `_count`/`_lastUpdated` alone both return a 400
//     ("at least one of _id, identifier, name, family, given, birthdate, phone, email,
//     address-postalcode, or -pageContext must be provided"). `ORACLE_PATIENT_SEARCH_QUERY`
//     supplies that required criterion; Patient can never be `_lastUpdated`-filtered.
//   - Condition/MedicationRequest require patient/subject/_id scoping (confirmed via a live 400)
//     and reject comma-separated patient batching ("multiple values for query parameter is not
//     supported") — hence `clinicalSearchScope: 'per-patient'`, one real API call per patient.
//   - `_lastUpdated` DOES work once patient-scoped (confirmed 200), so clinical data can still be
//     incrementally filtered even though patient discovery can't be.
//   - Bundle `link[rel=next]` pagination works normally once a query has real results (confirmed
//     for both Patient and MedicationRequest) — reuses the same generic fetchPageWith as HAPI.
const client = createFhirHttpClient(env.oracleFhirBaseUrl);
const limiter = createRateLimiter();

// ORACLE_PATIENT_SEARCH_QUERY is a raw querystring fragment (e.g. "family=smart&given=joe") — may
// hold more than one param, so parse it properly rather than a naive single split('=').
function parseConfiguredQuery(raw: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(raw));
}

export const oracleProvider: FhirProvider = {
  buildSearchUrl(resourceType) {
    // watermark intentionally ignored — Patient has no _lastUpdated support on this server.
    return buildSearchUrl(
      env.oracleFhirBaseUrl,
      resourceType,
      parseConfiguredQuery(env.oraclePatientSearchQuery),
    );
  },

  fetchPage<T extends FhirResource>(url: string) {
    return fetchPageWith<T>(client, limiter, url);
  },

  async fetchPatientById(fhirId: string): Promise<FhirPatient> {
    const response = await limiter.schedule(() =>
      client.get<FhirPatient>(`/Patient`, { params: { _id: fhirId } }),
    );
    const bundle = response.data as unknown as { entry?: { resource: FhirPatient }[] };
    const patient = bundle.entry?.[0]?.resource;
    if (!patient) {
      throw new Error(`Oracle Health: Patient ${fhirId} not found`);
    }
    return patient;
  },

  clinicalSearchScope: 'per-patient',

  buildPatientScopedSearchUrl(resourceType, patientFhirId, watermark) {
    const params: Record<string, string> = { patient: patientFhirId };
    if (watermark) {
      params['_lastUpdated'] = `gt${watermark.toISOString()}`;
    }
    return buildSearchUrl(env.oracleFhirBaseUrl, resourceType, params);
  },

  // Verified field-by-field against specs/oracle-health/*.md real sample responses — every field
  // these read (name[0].text, identifier[0], code.coding[0], subject.reference,
  // dosageInstruction[0], etc.) is present with the same shape HAPI's samples use. No overrides
  // needed for the fields we currently track.
  normalizePatient,
  normalizeCondition,
  normalizeMedicationRequest,
};
