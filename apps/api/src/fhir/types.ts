// Minimal FHIR R4 shapes covering exactly the fields present in the `_summary=data` sample
// responses (specs/patient-list.json, specs/conditions.json, specs/medication-requests.json).
// Not a full FHIR type library — extend only if a field we actually normalize is missing.

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirReference {
  reference?: string;
}

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
}

export interface FhirIdentifier {
  system?: string;
  value?: string;
}

export interface FhirHumanName {
  use?: string;
  text?: string;
  family?: string;
  given?: string[];
}

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  meta?: FhirMeta;
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  gender?: string;
  birthDate?: string;
}

export interface FhirCondition {
  resourceType: 'Condition';
  id: string;
  meta?: FhirMeta;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
}

export interface FhirDosage {
  text?: string;
  route?: FhirCodeableConcept;
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  meta?: FhirMeta;
  status?: string;
  intent?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  dosageInstruction?: FhirDosage[];
}

export type FhirResource = FhirPatient | FhirCondition | FhirMedicationRequest;

export interface FhirBundleLink {
  relation: string;
  url: string;
}

export interface FhirBundleEntry<T extends FhirResource = FhirResource> {
  fullUrl?: string;
  resource: T;
}

export interface FhirBundle<T extends FhirResource = FhirResource> {
  resourceType: 'Bundle';
  type: string;
  link?: FhirBundleLink[];
  entry?: FhirBundleEntry<T>[];
}

// Splits "Patient/665e2f0b-..." into the bare id. Returns undefined for absent/malformed references.
export function referenceId(reference: FhirReference | undefined): string | undefined {
  const value = reference?.reference;
  if (!value) return undefined;
  const parts = value.split('/');
  return parts.length >= 2 ? parts[1] : undefined;
}
