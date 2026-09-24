import { Prisma } from '../../../../generated/prisma';
import { hapiClient } from '../fhir/hapiClient';
import { fhirRateLimiter } from '../fhir/rateLimiter';
import type { FhirCondition, FhirMedicationRequest, FhirPatient } from '../fhir/types';
import { prisma } from '../lib/prisma';
import { normalizeCondition } from '../normalize/condition';
import { normalizeMedicationRequest } from '../normalize/medicationRequest';
import { normalizePatient } from '../normalize/patient';
import { recomputeJobStatus } from './completionCheck';
import {
  bulkUpsertConditions,
  bulkUpsertMedicationRequests,
  bulkUpsertPatients,
  bulkUpsertRaw,
} from './upsert';

// Drains every PENDING SyncMissingPatientRef for a job: fetches each missing patient
// individually, saves them, then reconciles — normalizes any already-stored raw
// Condition/MedicationRequest rows for that patient that were waiting on this FK. This is the
// decoupled "another action can fetch those records" step from the plan; it never blocks the
// Condition/MedicationRequest walks that discovered the gap.
export async function processBackfill(jobId: string): Promise<void> {
  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === 'CANCELLED') return;

  const pending = await prisma.syncMissingPatientRef.findMany({
    where: { jobId, status: 'PENDING' },
  });

  for (const ref of pending) {
    // Re-checked per ref (not just once up front) so a cancel mid-drain stops promptly rather
    // than after every currently-pending patient has been fetched.
    const current = await prisma.syncJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    if (current?.status === 'CANCELLED') return;

    try {
      const response = await fhirRateLimiter.schedule(() =>
        hapiClient.get<FhirPatient>(`/Patient/${ref.patientFhirId}`, {
          params: { _summary: 'data' },
        }),
      );
      const raw = response.data;
      const normalizedPatient = normalizePatient(raw);

      await prisma.$transaction(async (tx) => {
        await bulkUpsertRaw(tx, ref.source, 'Patient', jobId, [
          { fhirId: raw.id, raw, sourceLastUpdated: normalizedPatient.sourceLastUpdated },
        ]);
        await bulkUpsertPatients(tx, ref.source, [normalizedPatient]);
        await tx.syncMissingPatientRef.update({
          where: { id: ref.id },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        await reconcilePatientClinicalData(tx, ref.source, ref.patientFhirId, jobId);
      });
    } catch (error) {
      await prisma.syncMissingPatientRef
        .update({ where: { id: ref.id }, data: { status: 'FAILED' } })
        .catch(() => undefined);
      await prisma.syncJobEvent.create({
        data: {
          jobId,
          level: 'error',
          message: `Backfill failed for patient ${ref.patientFhirId}`,
          context: { error: error instanceof Error ? error.message : String(error) },
        },
      });
    }
  }

  await recomputeJobStatus(jobId);
}

async function reconcilePatientClinicalData(
  tx: Prisma.TransactionClient,
  source: string,
  patientFhirId: string,
  jobId: string,
): Promise<void> {
  const patient = await tx.patient.findUnique({
    where: { source_fhirId: { source: source as never, fhirId: patientFhirId } },
  });
  if (!patient) return;

  const subjectReference = `Patient/${patientFhirId}`;

  const rawConditions = await tx.$queryRaw<{ fhirId: string; raw: unknown }[]>`
    SELECT r."fhirId", r.raw FROM "RawFhirResource" r
    WHERE r.source = ${source}::"EhrSource" AND r."resourceType" = 'Condition'
      AND (r.raw -> 'subject' ->> 'reference') = ${subjectReference}
      AND NOT EXISTS (SELECT 1 FROM "Condition" c WHERE c.source = r.source AND c."fhirId" = r."fhirId")
  `;
  const conditionItems = normalizeSafely<FhirCondition, ReturnType<typeof normalizeCondition>>(
    rawConditions,
    normalizeCondition,
  ).map((item) => ({ ...item, patientId: patient.id }));
  await bulkUpsertConditions(tx, source, conditionItems);

  const rawMedications = await tx.$queryRaw<{ fhirId: string; raw: unknown }[]>`
    SELECT r."fhirId", r.raw FROM "RawFhirResource" r
    WHERE r.source = ${source}::"EhrSource" AND r."resourceType" = 'MedicationRequest'
      AND (r.raw -> 'subject' ->> 'reference') = ${subjectReference}
      AND NOT EXISTS (SELECT 1 FROM "MedicationRequest" m WHERE m.source = r.source AND m."fhirId" = r."fhirId")
  `;
  const medicationItems = normalizeSafely<
    FhirMedicationRequest,
    ReturnType<typeof normalizeMedicationRequest>
  >(rawMedications, normalizeMedicationRequest).map((item) => ({ ...item, patientId: patient.id }));
  await bulkUpsertMedicationRequests(tx, source, medicationItems);

  if (conditionItems.length === 0 && medicationItems.length === 0) return;

  await tx.syncJobEvent.create({
    data: {
      jobId,
      level: 'info',
      message: `Reconciled ${conditionItems.length} condition(s) and ${medicationItems.length} medication(s) for backfilled patient ${patientFhirId}`,
    },
  });
}

function normalizeSafely<TRaw, TResult>(
  rows: { fhirId: string; raw: unknown }[],
  normalize: (raw: TRaw) => TResult,
): TResult[] {
  const results: TResult[] = [];
  for (const row of rows) {
    try {
      results.push(normalize(row.raw as TRaw));
    } catch {
      // Already logged as a normalize failure on the original walk pass; skip here.
    }
  }
  return results;
}
