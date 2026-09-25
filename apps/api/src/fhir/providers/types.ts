import type { NormalizedCondition } from '../../normalize/condition';
import type { NormalizedMedicationRequest } from '../../normalize/medicationRequest';
import type { NormalizedPatient } from '../../normalize/patient';
import type { FhirCondition, FhirMedicationRequest, FhirPatient, FhirResource } from '../types';
import type { FetchPageResult } from '../pagination';

// Everything the sync engine needs from "the source we're syncing from" — one implementation per
// EhrSource, bundling the vendor-specific pieces (auth, base URL, default query params, response
// quirks) behind one uniform interface, so orchestrator.ts and the walk/backfill handlers never
// branch on source themselves — they just call `getProvider(job.source).xyz(...)`.
export interface FhirProvider {
  // Builds the initial (or watermark-filtered) search URL for a resource type. Each provider
  // decides its own default query params here (e.g. HAPI's `_summary=data`) — this is the "default
  // query params" customization point per provider.
  buildSearchUrl(resourceType: string, watermark: Date | null): string;

  // Fetches one page of a search Bundle, already routed through this provider's own client and
  // rate limiter.
  fetchPage<T extends FhirResource>(url: string): Promise<FetchPageResult<T>>;

  // Fetches a single Patient by id — used by the backfill step when a Condition/MedicationRequest
  // references a patient not yet saved locally.
  fetchPatientById(fhirId: string): Promise<FhirPatient>;

  // Whether Condition/MedicationRequest support an unscoped, patient-independent `_lastUpdated`
  // search (HAPI: yes — 'global'). If a provider's API requires patient/subject/_id scoping on
  // those resources (Oracle does — confirmed, not assumed), it's 'per-patient': the sync engine
  // fans out per already-known patient instead of walking one global search.
  clinicalSearchScope: 'global' | 'per-patient';

  // Only called for 'per-patient' providers. Builds a search URL scoped to one patient, with
  // `_lastUpdated` applied when a watermark exists (still a real optimization even though Patient
  // discovery itself can't be watermark-filtered for such providers).
  buildPatientScopedSearchUrl(
    resourceType: string,
    patientFhirId: string,
    watermark: Date | null,
  ): string;

  // Normalize functions default to the shared FHIR-R4-shape implementations in `normalize/*.ts`
  // (Patient/Condition/MedicationRequest's common fields are spec-defined, not vendor-specific),
  // but each provider references its own copy here so it can override any of them once real
  // response samples reveal a vendor-specific mapping quirk — same pattern used to build the HAPI
  // normalize functions against specs/*.json.
  normalizePatient(raw: FhirPatient): NormalizedPatient;
  normalizeCondition(raw: FhirCondition): NormalizedCondition;
  normalizeMedicationRequest(raw: FhirMedicationRequest): NormalizedMedicationRequest;
}

export class ProviderNotConfiguredError extends Error {}
