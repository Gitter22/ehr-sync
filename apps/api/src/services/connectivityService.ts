import { prisma } from '../lib/prisma';
import { checkPythonConnectivity } from './pythonClient';

export interface ConnectivityReport {
  api: { status: 'ok' | 'error'; database: 'connected' | 'disconnected'; message?: string };
  python: { status: 'ok' | 'error'; database: 'connected' | 'disconnected'; message?: string };
  overall: 'ok' | 'error';
}

export async function runConnectivityCheck(): Promise<ConnectivityReport> {
  const apiResult = await checkApiDatabase();
  const pythonResult = await checkPythonConnectivity();

  const overall = apiResult.status === 'ok' && pythonResult.status === 'ok' ? 'ok' : 'error';

  return { api: apiResult, python: pythonResult, overall };
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
