-- AlterTable
-- SERIAL backfills existing rows with sequential values in row order, so this is safe to run
-- against a table that already has data (three existing SyncJob rows from earlier testing).
ALTER TABLE "SyncJob" ADD COLUMN "displayId" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SyncJob_displayId_key" ON "SyncJob"("displayId");
