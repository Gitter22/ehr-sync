import Bottleneck from 'bottleneck';

// Shared across every FHIR walk (Patient, Condition, Medication, backfill) in this process, so
// running multiple walks concurrently never exceeds this ceiling regardless of how many are
// active at once — parallelism is subordinate to this limiter, not competing with it.
// Assumes a single worker process; a multi-process deployment would need a distributed limiter
// (see "Out of scope" in the sync engine plan).
export const fhirRateLimiter = new Bottleneck({
  maxConcurrent: 4,
  minTime: 250,
});
