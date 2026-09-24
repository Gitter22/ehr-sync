import { hapiClient } from './hapiClient';
import { fhirRateLimiter } from './rateLimiter';
import type { FhirBundle, FhirResource } from './types';

export interface FetchPageResult<T extends FhirResource> {
  resources: T[];
  nextUrl: string | null;
}

// Fetches one page of a FHIR search Bundle. `url` is either a full search URL (first page) or a
// prior page's opaque `next` link — we never construct pagination offsets ourselves, only follow
// whatever the server hands back, since HAPI's cursor tokens are opaque.
export async function fetchPage<T extends FhirResource>(url: string): Promise<FetchPageResult<T>> {
  const response = await fhirRateLimiter.schedule(() => hapiClient.get<FhirBundle<T>>(url));
  const bundle = response.data;
  const resources = (bundle.entry ?? []).map((entry) => entry.resource);
  const nextLink = bundle.link?.find((link) => link.relation === 'next');
  return { resources, nextUrl: nextLink?.url ?? null };
}

export function buildSearchUrl(
  baseUrl: string,
  resourceType: string,
  params: Record<string, string>,
): string {
  const url = new URL(`${baseUrl}/${resourceType}`);
  url.searchParams.set('_summary', 'data');
  url.searchParams.set('_count', '50');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
