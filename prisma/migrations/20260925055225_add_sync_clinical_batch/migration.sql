-- CreateEnum
CREATE TYPE "SyncClinicalBatchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "SyncClinicalBatch" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "batchIndex" INTEGER NOT NULL,
    "patientFhirIds" TEXT[],
    "status" "SyncClinicalBatchStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncClinicalBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncClinicalBatch_jobId_resourceType_batchIndex_key" ON "SyncClinicalBatch"("jobId", "resourceType", "batchIndex");

-- AddForeignKey
ALTER TABLE "SyncClinicalBatch" ADD CONSTRAINT "SyncClinicalBatch_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SyncJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
