import { httpClient, toApiError } from './httpClient';
import type { DocumentChunkView, DocumentDetail, LobDocumentSummary, RetrievedChunkResult } from '../types';

export async function uploadDocument(file: File, onProgress?: (percent: number) => void): Promise<LobDocumentSummary> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const { data } = await httpClient.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return data.document;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchDocuments(): Promise<LobDocumentSummary[]> {
  try {
    const { data } = await httpClient.get('/api/documents');
    return data.documents;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchDocument(id: string): Promise<DocumentDetail> {
  try {
    const { data } = await httpClient.get(`/api/documents/${id}`);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchDocumentChunks(id: string): Promise<DocumentChunkView[]> {
  try {
    const { data } = await httpClient.get(`/api/documents/${id}/chunks`);
    return data.chunks;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteDocument(id: string): Promise<void> {
  try {
    await httpClient.delete(`/api/documents/${id}`);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function retryDocument(id: string): Promise<void> {
  try {
    await httpClient.post(`/api/documents/${id}/retry`);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function searchDocuments(query: string): Promise<RetrievedChunkResult[]> {
  try {
    const { data } = await httpClient.post('/api/documents/search', { query });
    return data.results;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function downloadDocumentFile(id: string, fileName: string): Promise<void> {
  try {
    const response = await httpClient.get(`/api/documents/${id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    throw toApiError(err);
  }
}
