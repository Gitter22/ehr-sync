import type { FhirPatient } from '../fhir/types';

export interface NormalizedPatient {
  fhirId: string;
  identifierSystem: string | null;
  identifierValue: string | null;
  active: boolean | null;
  fullName: string | null;
  familyName: string | null;
  givenName: string | null;
  gender: string | null;
  birthDate: Date | null;
  sourceVersionId: string | null;
  sourceLastUpdated: Date | null;
}

// Pure mapping from a raw FHIR Patient (as returned by `_summary=data`) to our normalized shape.
// Every field is defensively optional — normalize/*.ts functions must never throw on a resource
// merely being sparse; a genuinely malformed resource (wrong types) is allowed to throw so the
// caller can isolate it per-record.
export function normalizePatient(raw: FhirPatient): NormalizedPatient {
  const identifier = raw.identifier?.[0];
  const name = raw.name?.[0];

  return {
    fhirId: raw.id,
    identifierSystem: identifier?.system ?? null,
    identifierValue: identifier?.value ?? null,
    active: raw.active ?? null,
    fullName: name?.text ?? null,
    familyName: name?.family ?? null,
    givenName: name?.given?.join(' ') ?? null,
    gender: raw.gender ?? null,
    birthDate: raw.birthDate ? new Date(raw.birthDate) : null,
    sourceVersionId: raw.meta?.versionId ?? null,
    sourceLastUpdated: raw.meta?.lastUpdated ? new Date(raw.meta.lastUpdated) : null,
  };
}
