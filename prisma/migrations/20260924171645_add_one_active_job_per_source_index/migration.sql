-- Enforce at most one active (PENDING/RUNNING) sync job per source, so a race between two
-- near-simultaneous POST /api/sync requests can't both create an in-progress job for the same
-- source — the second insert violates this index and the app surfaces it as "already in progress".
CREATE UNIQUE INDEX "SyncJob_one_active_per_source"
  ON "SyncJob" (source)
  WHERE status IN ('PENDING', 'RUNNING');
