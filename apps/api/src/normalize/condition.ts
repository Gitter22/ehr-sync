import { referenceId, type FhirCondition } from '../fhir/types';

export interface NormalizedCondition {
  fhirId: string;
  patientFhirId: string;
  codeText: string | null;
  codeSystem: string | null;
  codeValue: string | null;
  clinicalStatus: string | null;
  verificationStatus: string | null;
  encounterReference: string | null;
  sourceVersionId: string | null;
  sourceLastUpdated: Date | null;
}

// Throws if the resource has no `subject` reference — a Condition without a patient link is not
// something we can normalize at all (there is no FK to attach it to), so this record is treated
// as a per-record normalization failure like any other malformed resource.
export function normalizeCondition(raw: FhirCondition): NormalizedCondition {
  const patientFhirId = referenceId(raw.subject);
  if (!patientFhirId) {
    throw new Error(`Condition ${raw.id} has no resolvable subject reference`);
  }

  const coding = raw.code?.coding?.[0];

  return {
    fhirId: raw.id,
    patientFhirId,
    codeText: raw.code?.text ?? coding?.display ?? null,
    codeSystem: coding?.system ?? null,
    codeValue: coding?.code ?? null,
    clinicalStatus: raw.clinicalStatus?.coding?.[0]?.code ?? null,
    verificationStatus: raw.verificationStatus?.coding?.[0]?.code ?? null,
    encounterReference: raw.encounter?.reference ?? null,
    sourceVersionId: raw.meta?.versionId ?? null,
    sourceLastUpdated: raw.meta?.lastUpdated ? new Date(raw.meta.lastUpdated) : null,
  };
}
