import { httpClient, toApiError } from './httpClient';
import type { AuthUser, UserRole } from '../types';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  lobId?: string;
}

export async function register(payload: RegisterPayload): Promise<{ token: string; user: AuthUser }> {
  try {
    const { data } = await httpClient.post('/api/auth/register', payload);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  try {
    const { data } = await httpClient.post('/api/auth/login', { email, password });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function logout(): Promise<void> {
  try {
    await httpClient.post('/api/auth/logout');
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchMe(): Promise<AuthUser> {
  try {
    const { data } = await httpClient.get('/api/auth/me');
    return data.user;
  } catch (err) {
    throw toApiError(err);
  }
}
