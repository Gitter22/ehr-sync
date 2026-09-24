import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../../generated/prisma';
import type { NormalizedCondition } from '../normalize/condition';
import type { NormalizedMedicationRequest } from '../normalize/medicationRequest';
import type { NormalizedPatient } from '../normalize/patient';

type Tx = Prisma.TransactionClient;

export interface RawUpsertInput {
  fhirId: string;
  raw: unknown;
  sourceLastUpdated: Date | null;
}

interface UpsertCounts {
  created: number;
  updated: number;
}

// Everything here writes with one multi-row `INSERT ... ON CONFLICT` statement per call — a
// 50-record page costs one round trip, not fifty. See "Bulk writes, not per-record writes" in the
// sync engine plan. Insert-vs-update is distinguished via `RETURNING (xmax = 0) AS inserted`
// (the standard Postgres trick), since Prisma's own upsert() doesn't expose which branch fired.

export async function bulkUpsertRaw(
  tx: Tx,
  source: string,
  resourceType: string,
  syncJobId: string,
  items: RawUpsertInput[],
): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map(
    (item) =>
      Prisma.sql`(${randomUUID()}, ${source}::"EhrSource", ${resourceType}, ${item.fhirId}, ${JSON.stringify(item.raw)}::jsonb, ${item.sourceLastUpdated}, now(), ${syncJobId})`,
  );
  await tx.$executeRaw`
    INSERT INTO "RawFhirResource" (id, source, "resourceType", "fhirId", raw, "sourceLastUpdated", "fetchedAt", "syncJobId")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT (source, "resourceType", "fhirId")
    DO UPDATE SET
      raw = EXCLUDED.raw,
      "sourceLastUpdated" = EXCLUDED."sourceLastUpdated",
      "fetchedAt" = now(),
      "syncJobId" = EXCLUDED."syncJobId"
  `;
}

export async function bulkUpsertPatients(
  tx: Tx,
  source: string,
  items: NormalizedPatient[],
): Promise<UpsertCounts> {
  if (items.length === 0) return { created: 0, updated: 0 };
  const rows = items.map(
    (p) =>
      Prisma.sql`(${randomUUID()}, ${source}::"EhrSource", ${p.fhirId}, ${p.identifierSystem}, ${p.identifierValue}, ${p.active}, ${p.fullName}, ${p.familyName}, ${p.givenName}, ${p.gender}, ${p.birthDate}, ${p.sourceVersionId}, ${p.sourceLastUpdated}, now(), now())`,
  );
  const result = await tx.$queryRaw<{ inserted: boolean }[]>`
    INSERT INTO "Patient" (id, source, "fhirId", "identifierSystem", "identifierValue", active, "fullName", "familyName", "givenName", gender, "birthDate", "sourceVersionId", "sourceLastUpdated", "createdAt", "updatedAt")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT (source, "fhirId") DO UPDATE SET
      "identifierSystem" = EXCLUDED."identifierSystem",
      "identifierValue" = EXCLUDED."identifierValue",
      active = EXCLUDED.active,
      "fullName" = EXCLUDED."fullName",
      "familyName" = EXCLUDED."familyName",
      "givenName" = EXCLUDED."givenName",
      gender = EXCLUDED.gender,
      "birthDate" = EXCLUDED."birthDate",
      "sourceVersionId" = EXCLUDED."sourceVersionId",
      "sourceLastUpdated" = EXCLUDED."sourceLastUpdated",
      "updatedAt" = now()
    RETURNING (xmax = 0) AS inserted
  `;
  const created = result.filter((r) => r.inserted).length;
  return { created, updated: result.length - created };
}

export async function bulkUpsertConditions(
  tx: Tx,
  source: string,
  items: (NormalizedCondition & { patientId: string })[],
): Promise<UpsertCounts> {
  if (items.length === 0) return { created: 0, updated: 0 };
  const rows = items.map(
    (c) =>
      Prisma.sql`(${randomUUID()}, ${source}::"EhrSource", ${c.fhirId}, ${c.patientId}, ${c.codeText}, ${c.codeSystem}, ${c.codeValue}, ${c.clinicalStatus}, ${c.verificationStatus}, ${c.encounterReference}, ${c.sourceVersionId}, ${c.sourceLastUpdated}, now(), now())`,
  );
  const result = await tx.$queryRaw<{ inserted: boolean }[]>`
    INSERT INTO "Condition" (id, source, "fhirId", "patientId", "codeText", "codeSystem", "codeValue", "clinicalStatus", "verificationStatus", "encounterReference", "sourceVersionId", "sourceLastUpdated", "createdAt", "updatedAt")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT (source, "fhirId") DO UPDATE SET
      "patientId" = EXCLUDED."patientId",
      "codeText" = EXCLUDED."codeText",
      "codeSystem" = EXCLUDED."codeSystem",
      "codeValue" = EXCLUDED."codeValue",
      "clinicalStatus" = EXCLUDED."clinicalStatus",
      "verificationStatus" = EXCLUDED."verificationStatus",
      "encounterReference" = EXCLUDED."encounterReference",
      "sourceVersionId" = EXCLUDED."sourceVersionId",
      "sourceLastUpdated" = EXCLUDED."sourceLastUpdated",
      "updatedAt" = now()
    RETURNING (xmax = 0) AS inserted
  `;
  const created = result.filter((r) => r.inserted).length;
  return { created, updated: result.length - created };
}

export async function bulkUpsertMedicationRequests(
  tx: Tx,
  source: string,
  items: (NormalizedMedicationRequest & { patientId: string })[],
): Promise<UpsertCounts> {
  if (items.length === 0) return { created: 0, updated: 0 };
  const rows = items.map(
    (m) =>
      Prisma.sql`(${randomUUID()}, ${source}::"EhrSource", ${m.fhirId}, ${m.patientId}, ${m.medicationText}, ${m.status}, ${m.intent}, ${m.dosageText}, ${m.dosageRouteText}, ${m.encounterReference}, ${m.sourceVersionId}, ${m.sourceLastUpdated}, now(), now())`,
  );
  const result = await tx.$queryRaw<{ inserted: boolean }[]>`
    INSERT INTO "MedicationRequest" (id, source, "fhirId", "patientId", "medicationText", status, intent, "dosageText", "dosageRouteText", "encounterReference", "sourceVersionId", "sourceLastUpdated", "createdAt", "updatedAt")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT (source, "fhirId") DO UPDATE SET
      "patientId" = EXCLUDED."patientId",
      "medicationText" = EXCLUDED."medicationText",
      status = EXCLUDED.status,
      intent = EXCLUDED.intent,
      "dosageText" = EXCLUDED."dosageText",
      "dosageRouteText" = EXCLUDED."dosageRouteText",
      "encounterReference" = EXCLUDED."encounterReference",
      "sourceVersionId" = EXCLUDED."sourceVersionId",
      "sourceLastUpdated" = EXCLUDED."sourceLastUpdated",
      "updatedAt" = now()
    RETURNING (xmax = 0) AS inserted
  `;
  const created = result.filter((r) => r.inserted).length;
  return { created, updated: result.length - created };
}

// Maps FHIR patient ids to our internal Patient row ids, for whichever of `patientFhirIds`
// already exist locally. Ids not present in the returned map are the ones that need to go
// through SyncMissingPatientRef.
export async function resolvePatientIds(
  tx: Tx,
  source: string,
  patientFhirIds: string[],
): Promise<Map<string, string>> {
  if (patientFhirIds.length === 0) return new Map();
  const rows = await tx.patient.findMany({
    where: { source: source as never, fhirId: { in: patientFhirIds } },
    select: { id: true, fhirId: true },
  });
  return new Map(rows.map((r) => [r.fhirId, r.id]));
}

export async function bulkUpsertMissingPatientRefs(
  tx: Tx,
  jobId: string,
  source: string,
  patientFhirIds: string[],
): Promise<void> {
  if (patientFhirIds.length === 0) return;
  const rows = patientFhirIds.map(
    (id) =>
      Prisma.sql`(${randomUUID()}, ${jobId}, ${source}::"EhrSource", ${id}, 'PENDING', now())`,
  );
  await tx.$executeRaw`
    INSERT INTO "SyncMissingPatientRef" (id, "jobId", source, "patientFhirId", status, "discoveredAt")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT ("jobId", "patientFhirId") DO NOTHING
  `;
}
