-- CreateEnum
CREATE TYPE "EhrSource" AS ENUM ('HAPI_FHIR', 'ORACLE_HEALTH', 'EPIC');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SyncTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MissingPatientStatus" AS ENUM ('PENDING', 'RESOLVED', 'FAILED');

-- CreateTable
CREATE TABLE "RawFhirResource" (
    "id" TEXT NOT NULL,
    "source" "EhrSource" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "fhirId" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "sourceLastUpdated" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncJobId" TEXT,

    CONSTRAINT "RawFhirResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "source" "EhrSource" NOT NULL,
    "fhirId" TEXT NOT NULL,
    "identifierSystem" TEXT,
    "identifierValue" TEXT,
    "active" BOOLEAN,
    "fullName" TEXT,
    "familyName" TEXT,
    "givenName" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "sourceVersionId" TEXT,
    "sourceLastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" TEXT NOT NULL,
    "source" "EhrSource" NOT NULL,
    "fhirId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "codeText" TEXT,
    "codeSystem" TEXT,
    "codeValue" TEXT,
    "clinicalStatus" TEXT,
    "verificationStatus" TEXT,
    "encounterReference" TEXT,
    "sourceVersionId" TEXT,
    "sourceLastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationRequest" (
    "id" TEXT NOT NULL,
    "source" "EhrSource" NOT NULL,
    "fhirId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicationText" TEXT,
    "status" TEXT,
    "intent" TEXT,
    "dosageText" TEXT,
    "dosageRouteText" TEXT,
    "encounterReference" TEXT,
    "sourceVersionId" TEXT,
    "sourceLastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncTask" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "cursorUrl" TEXT,
    "status" "SyncTaskStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncMissingPatientRef" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "source" "EhrSource" NOT NULL,
    "patientFhirId" TEXT NOT NULL,
    "status" "MissingPatientStatus" NOT NULL DEFAULT 'PENDING',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SyncMissingPatientRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "source" "EhrSource" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "triggeredBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJobStat" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SyncJobStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJobEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncJobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawFhirResource_source_resourceType_fhirId_key" ON "RawFhirResource"("source", "resourceType", "fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_source_fhirId_key" ON "Patient"("source", "fhirId");

-- CreateIndex
CREATE INDEX "Condition_patientId_idx" ON "Condition"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Condition_source_fhirId_key" ON "Condition"("source", "fhirId");

-- CreateIndex
CREATE INDEX "MedicationRequest_patientId_idx" ON "MedicationRequest"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationRequest_source_fhirId_key" ON "MedicationRequest"("source", "fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncTask_jobId_resourceType_key" ON "SyncTask"("jobId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "SyncMissingPatientRef_jobId_patientFhirId_key" ON "SyncMissingPatientRef"("jobId", "patientFhirId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncJobStat_jobId_resourceType_key" ON "SyncJobStat"("jobId", "resourceType");

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationRequest" ADD CONSTRAINT "MedicationRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncTask" ADD CONSTRAINT "SyncTask_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SyncJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMissingPatientRef" ADD CONSTRAINT "SyncMissingPatientRef_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SyncJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJobStat" ADD CONSTRAINT "SyncJobStat_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SyncJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJobEvent" ADD CONSTRAINT "SyncJobEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SyncJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
