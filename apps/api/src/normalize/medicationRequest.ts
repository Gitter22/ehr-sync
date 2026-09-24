import { referenceId, type FhirMedicationRequest } from '../fhir/types';

export interface NormalizedMedicationRequest {
  fhirId: string;
  patientFhirId: string;
  medicationText: string | null;
  status: string | null;
  intent: string | null;
  dosageText: string | null;
  dosageRouteText: string | null;
  encounterReference: string | null;
  sourceVersionId: string | null;
  sourceLastUpdated: Date | null;
}

// Throws if the resource has no `subject` reference — same reasoning as normalizeCondition.
export function normalizeMedicationRequest(
  raw: FhirMedicationRequest,
): NormalizedMedicationRequest {
  const patientFhirId = referenceId(raw.subject);
  if (!patientFhirId) {
    throw new Error(`MedicationRequest ${raw.id} has no resolvable subject reference`);
  }

  const dosage = raw.dosageInstruction?.[0];

  return {
    fhirId: raw.id,
    patientFhirId,
    medicationText: raw.medicationCodeableConcept?.text ?? null,
    status: raw.status ?? null,
    intent: raw.intent ?? null,
    dosageText: dosage?.text ?? null,
    dosageRouteText: dosage?.route?.text ?? null,
    encounterReference: raw.encounter?.reference ?? null,
    sourceVersionId: raw.meta?.versionId ?? null,
    sourceLastUpdated: raw.meta?.lastUpdated ? new Date(raw.meta.lastUpdated) : null,
  };
}
