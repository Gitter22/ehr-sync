import { hapiProvider } from './hapi';
import { oracleProvider } from './oracle';
import type { FhirProvider } from './types';

export class UnsupportedProviderError extends Error {}

// Adding a new source: implement FhirProvider in its own file (see hapi.ts / oracle.ts) and
// register it here. Nothing in orchestrator.ts or the walk/backfill handlers needs to change.
const PROVIDERS: Partial<Record<string, FhirProvider>> = {
  HAPI_FHIR: hapiProvider,
  ORACLE_HEALTH: oracleProvider,
  // EPIC: not implemented — SMART on FHIR registration is out of scope per specs/requirements.txt.
};

export function getProvider(source: string): FhirProvider {
  const provider = PROVIDERS[source];
  if (!provider) {
    throw new UnsupportedProviderError(`No FHIR provider registered for source: ${source}`);
  }
  return provider;
}
