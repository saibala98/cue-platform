import { httpClient, toApiError } from './httpClient';
import type { AdminModuleCompletionRow, AdminModuleSummary } from '../types';

export async function fetchAdminModules(): Promise<AdminModuleSummary[]> {
  try {
    const { data } = await httpClient.get('/api/modules/admin');
    return data.modules;
  } catch (err) {
    throw toApiError(err);
  }
}

export interface CreateModuleLessonInput {
  title: string;
  contentType: 'text' | 'url';
  contentBody?: string;
  contentUrl?: string;
}

export interface CreateModuleQuizInput {
  questionText: string;
  options: string[];
  correctIndex: number;
}

export interface CreateModulePayload {
  title: string;
  version: string;
  slaDays: number;
  lessons: CreateModuleLessonInput[];
  quizQuestions: CreateModuleQuizInput[];
  assignAll: boolean;
  employeeIds?: string[];
}

export async function createModule(payload: CreateModulePayload): Promise<{ id: string; title: string }> {
  try {
    const { data } = await httpClient.post('/api/modules/admin', payload);
    return data.module;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchModuleCompletions(moduleId: string): Promise<AdminModuleCompletionRow[]> {
  try {
    const { data } = await httpClient.get(`/api/modules/admin/${moduleId}/completions`);
    return data.employees;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function assignModuleToAll(moduleId: string): Promise<void> {
  try {
    await httpClient.post(`/api/modules/admin/${moduleId}/assign`, { assignAll: true });
  } catch (err) {
    throw toApiError(err);
  }
}
