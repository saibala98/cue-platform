import { httpClient, toApiError } from './httpClient';
import type { AssignedModule, ModuleDetail, ModuleProgress } from '../types';

export async function fetchAssignedModules(): Promise<AssignedModule[]> {
  try {
    const { data } = await httpClient.get('/api/modules/assigned');
    return data.modules;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchModuleDetail(moduleId: string): Promise<ModuleDetail> {
  try {
    const { data } = await httpClient.get(`/api/modules/${moduleId}`);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchModuleProgress(moduleId: string): Promise<ModuleProgress> {
  try {
    const { data } = await httpClient.get(`/api/modules/${moduleId}/progress`);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function submitModuleCompletion(moduleId: string, answers: number[]): Promise<{ score: number | null }> {
  try {
    const { data } = await httpClient.post(`/api/modules/${moduleId}/completion`, { answers });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}
