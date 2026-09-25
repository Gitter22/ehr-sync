import path from 'node:path';
import { config as loadEnv } from 'dotenv';

// __dirname is apps/api/src/config (or apps/api/dist/config after build) — repo root is 4 levels up.
const rootDir = path.resolve(__dirname, '../../../..');
loadEnv({ path: path.join(rootDir, '.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  // Connection caps per API process. A small managed Postgres (e.g. a 256MB Fly VM) can't afford
  // Prisma's default pool (cpus*2+1) plus pg-boss's default 10 on every machine, so keep both low.
  prismaConnectionLimit: Number(process.env.PRISMA_CONNECTION_LIMIT ?? 8),
  pgBossPoolMax: Number(process.env.PGBOSS_POOL_MAX ?? 4),
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL ?? 'http://localhost:8000',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  hapiFhirBaseUrl: process.env.HAPI_FHIR_BASE_URL ?? 'https://hapi.fhir.org/baseR4',
  // Oracle Health provider — Cerner's public "open sandbox", no auth (verified live: every call
  // succeeds with just an Accept header). Patient search has no unscoped listing (confirmed via a
  // live 400 — see fhir/providers/oracle.ts), so a real search criterion is required; this is a
  // single server-configured default, not a per-request parameter.
  oracleFhirBaseUrl:
    process.env.ORACLE_FHIR_BASE_URL ??
    'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d',
  oraclePatientSearchQuery: process.env.ORACLE_PATIENT_SEARCH_QUERY ?? 'family=smart',
};
