-- CreateEnum
CREATE TYPE "SourceResetStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "SourceResetAudit" (
    "id" TEXT NOT NULL,
    "displayId" SERIAL NOT NULL,
    "source" "EhrSource" NOT NULL,
    "status" "SourceResetStatus" NOT NULL DEFAULT 'PENDING',
    "triggeredBy" TEXT,
    "deleted" JSONB,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SourceResetAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceResetAudit_displayId_key" ON "SourceResetAudit"("displayId");
