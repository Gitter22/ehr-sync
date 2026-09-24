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
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL ?? 'http://localhost:8000',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
