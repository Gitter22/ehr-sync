import type { Prisma } from '../../../../generated/prisma';

// Checked inside the same transaction as a page's writes, using the SyncJobStat row being updated
// in that same transaction, so the cumulative count is always consistent with what was actually
// just committed. Called after the page's own writes, before deciding the task's next state — if
// this returns true, the caller treats the page as if it were the last one (task -> COMPLETED)
// even though a real `nextUrl` may still exist.
export async function isMaxRecordsReached(
  tx: Prisma.TransactionClient,
  jobId: string,
  resourceType: string,
  maxRecordsPerTask: number | null,
): Promise<boolean> {
  if (maxRecordsPerTask == null) return false;
  const stat = await tx.syncJobStat.findUnique({
    where: { jobId_resourceType: { jobId, resourceType } },
  });
  return (stat?.fetched ?? 0) >= maxRecordsPerTask;
}
