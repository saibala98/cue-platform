import { httpClient, toApiError } from './httpClient';
import type {
  CompletionRow,
  DashboardModuleOption,
  DashboardSummaryData,
  MentorTableRow,
  OverdueItem,
  ReminderTargetType,
} from '../types';

export async function fetchDashboardSummary(): Promise<DashboardSummaryData> {
  try {
    const { data } = await httpClient.get('/api/leader/dashboard/summary');
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchCompletionTable(): Promise<CompletionRow[]> {
  try {
    const { data } = await httpClient.get('/api/leader/dashboard/completions');
    return data.rows;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchMentorTable(): Promise<MentorTableRow[]> {
  try {
    const { data } = await httpClient.get('/api/leader/dashboard/mentors');
    return data.rows;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchOverdueItems(): Promise<OverdueItem[]> {
  try {
    const { data } = await httpClient.get('/api/leader/dashboard/overdue');
    return data.items;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function sendReminder(targetType: ReminderTargetType, targetId: string): Promise<void> {
  try {
    await httpClient.post(`/api/leader/dashboard/overdue/${targetType}/${targetId}/remind`);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchDashboardModules(): Promise<DashboardModuleOption[]> {
  try {
    const { data } = await httpClient.get('/api/leader/dashboard/modules');
    return data.modules;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function exportCompletionCsv(): Promise<void> {
  try {
    const response = await httpClient.get('/api/leader/dashboard/export', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cue_completion_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    throw toApiError(err);
  }
}
