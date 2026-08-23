import axios, { AxiosError } from 'axios';
import { loadToken } from './tokenStorage';
import { DEMO_MODE } from '../demo/demoMode';
import { mockAdapter } from '../demo/mockAdapter';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export const httpClient = axios.create({ baseURL: API_BASE_URL });

// Demo mode swaps the transport, not the call sites — every api/*.ts function
// still calls httpClient.get/post/etc. normally, so no other frontend code
// needs to know whether it's talking to Neon or to in-memory demo data.
if (DEMO_MODE) {
  httpClient.defaults.adapter = mockAdapter;
}

httpClient.interceptors.request.use((config) => {
  const token = loadToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiClientError {
  kind: 'network' | 'auth' | 'validation' | 'server';
  message: string;
  status?: number;
}

export function toApiError(err: unknown): ApiClientError {
  if (axios.isAxiosError(err)) {
    const error = err as AxiosError<{ error?: string }>;
    if (!error.response) {
      return { kind: 'network', message: 'Could not reach the server. Check your connection and try again.' };
    }
    const status = error.response.status;
    const message = error.response.data?.error ?? error.message;
    if (status === 401 || status === 403) return { kind: 'auth', message, status };
    if (status >= 400 && status < 500) return { kind: 'validation', message, status };
    return { kind: 'server', message: message || 'Something went wrong on the server.', status };
  }
  return { kind: 'server', message: 'An unexpected error occurred.' };
}
