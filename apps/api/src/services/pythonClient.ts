import axios from 'axios';
import { env } from '../config/env';

const client = axios.create({
  baseURL: env.pythonServiceUrl,
  timeout: 5000,
});

export interface PythonConnectivityResult {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  message?: string;
}

export async function checkPythonConnectivity(): Promise<PythonConnectivityResult> {
  try {
    const { data } = await client.post<PythonConnectivityResult>('/connectivity-check');
    return data;
  } catch (error) {
    return {
      status: 'error',
      database: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown error contacting Python service',
    };
  }
}
