import { httpClient, toApiError } from './httpClient';
import type { AssignableJoinee } from '../types';

export async function fetchJoinees(): Promise<AssignableJoinee[]> {
  try {
    const { data } = await httpClient.get('/api/leader/joinees');
    return data.joinees;
  } catch (err) {
    throw toApiError(err);
  }
}
