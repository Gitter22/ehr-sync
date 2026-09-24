-- AlterEnum
ALTER TYPE "SyncJobStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "SyncTaskStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "SyncJob" ADD COLUMN     "allTasksCompleted" BOOLEAN NOT NULL DEFAULT false;
