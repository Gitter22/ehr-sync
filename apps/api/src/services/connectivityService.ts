import { prisma } from '../lib/prisma';

export interface ConnectivityReport {
  api: { status: 'ok' | 'error'; database: 'connected' | 'disconnected'; message?: string };
  overall: 'ok' | 'error';
}

// Proves Node API -> PostgreSQL connectivity only — see the ConnectivityCheck model's doc comment
// in schema.prisma. Does not touch apps/python; that integration is out of scope here.
export async function runConnectivityCheck(): Promise<ConnectivityReport> {
  const apiResult = await checkApiDatabase();
  return { api: apiResult, overall: apiResult.status };
}

async function checkApiDatabase(): Promise<ConnectivityReport['api']> {
  try {
    await prisma.connectivityCheck.create({ data: { source: 'node-api' } });
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    return {
      status: 'error',
      database: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}
