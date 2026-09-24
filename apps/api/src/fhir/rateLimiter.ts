import Bottleneck from 'bottleneck';

// One limiter per provider, not a shared global — each EHR source is a different physical server
// with its own rate limits, so throttling HAPI and Oracle against one shared budget would be both
// unfair (one source's traffic slows the other down for no reason) and pointless (doesn't actually
// protect either server correctly). Every walk/backfill for a given source shares that source's
// limiter, so parallelism within one provider is still subordinate to its own ceiling.
// Assumes a single worker process; a multi-process deployment would need a distributed limiter
// (see "Out of scope" in the sync engine plan).
export function createRateLimiter(): Bottleneck {
  return new Bottleneck({ maxConcurrent: 4, minTime: 250 });
}
