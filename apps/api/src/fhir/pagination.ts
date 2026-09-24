import type { AxiosInstance } from 'axios';
import type Bottleneck from 'bottleneck';
import type { FhirBundle, FhirResource } from './types';

export interface FetchPageResult<T extends FhirResource> {
  resources: T[];
  nextUrl: string | null;
}

// Fetches one page of a FHIR search Bundle through the given provider's client + rate limiter.
// `url` is either a full search URL (first page) or a prior page's opaque `next` link — we never
// construct pagination offsets ourselves, only follow whatever the server hands back, since
// pagination tokens are opaque (and not necessarily offset-based at all, depending on the server).
export async function fetchPageWith<T extends FhirResource>(
  client: AxiosInstance,
  limiter: Bottleneck,
  url: string,
): Promise<FetchPageResult<T>> {
  const response = await limiter.schedule(() => client.get<FhirBundle<T>>(url));
  const bundle = response.data;
  const resources = (bundle.entry ?? []).map((entry) => entry.resource);
  const nextLink = bundle.link?.find((link) => link.relation === 'next');
  return { resources, nextUrl: nextLink?.url ?? null };
}

// Low-level URL builder — takes whatever query params the caller wants; a provider's own
// buildSearchUrl decides its defaults (e.g. HAPI's `_summary=data`) and merges in `_lastUpdated`
// before calling this. Kept provider-agnostic so it's not tied to any one vendor's conventions.
export function buildSearchUrl(
  baseUrl: string,
  resourceType: string,
  params: Record<string, string>,
): string {
  const url = new URL(`${baseUrl}/${resourceType}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
