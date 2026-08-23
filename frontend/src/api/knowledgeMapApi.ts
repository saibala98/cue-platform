import { httpClient, toApiError } from './httpClient';
import type { KnowledgeMapEntry, KnowledgeMapEntryInput } from '../types';

export async function fetchKnowledgeMapEntries(lobId?: string): Promise<KnowledgeMapEntry[]> {
  try {
    const { data } = await httpClient.get('/api/knowledge-map', { params: lobId ? { lobId } : undefined });
    return data.entries;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function searchKnowledgeMap(query: string): Promise<KnowledgeMapEntry[]> {
  try {
    const { data } = await httpClient.get('/api/knowledge-map/search', { params: { q: query } });
    return data.entries;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchKnowledgeMapEntry(id: string): Promise<KnowledgeMapEntry> {
  try {
    const { data } = await httpClient.get(`/api/knowledge-map/${id}`);
    return data.entry;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createKnowledgeMapEntry(input: KnowledgeMapEntryInput): Promise<KnowledgeMapEntry> {
  try {
    const { data } = await httpClient.post('/api/knowledge-map', input);
    return data.entry;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateKnowledgeMapEntry(id: string, input: KnowledgeMapEntryInput): Promise<KnowledgeMapEntry> {
  try {
    const { data } = await httpClient.put(`/api/knowledge-map/${id}`, input);
    return data.entry;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteKnowledgeMapEntry(id: string): Promise<void> {
  try {
    await httpClient.delete(`/api/knowledge-map/${id}`);
  } catch (err) {
    throw toApiError(err);
  }
}
