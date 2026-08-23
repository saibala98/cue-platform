import { httpClient, toApiError } from './httpClient';
import type { Lob } from '../types';

export async function fetchLobs(): Promise<Lob[]> {
  try {
    const { data } = await httpClient.get('/api/lob');
    return data.lobs;
  } catch (err) {
    throw toApiError(err);
  }
}
