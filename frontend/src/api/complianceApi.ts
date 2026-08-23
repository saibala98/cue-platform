import { httpClient, toApiError } from './httpClient';
import type {
  AuditFilters,
  AuditRow,
  ComplianceModuleOption,
  ComplianceSummaryData,
  IntegrityCheckResult,
  ModuleVersionFamily,
} from '../types';

function toQuery(filters: AuditFilters): Record<string, string> {
  const q: Record<string, string> = {};
  if (filters.lobId) q.lobId = filters.lobId;
  if (filters.moduleId) q.moduleId = filters.moduleId;
  if (filters.from) q.from = filters.from;
  if (filters.to) q.to = filters.to;
  if (filters.status && filters.status !== 'all') q.status = filters.status;
  if (filters.search) q.search = filters.search;
  return q;
}

export async function fetchComplianceSummary(): Promise<ComplianceSummaryData> {
  try {
    const { data } = await httpClient.get('/api/compliance/summary');
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchAuditLog(filters: AuditFilters): Promise<AuditRow[]> {
  try {
    const { data } = await httpClient.get('/api/compliance/audit-log', { params: toQuery(filters) });
    return data.rows;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function exportAuditLog(filters: AuditFilters): Promise<void> {
  try {
    const response = await httpClient.get('/api/compliance/audit-log/export', { params: toQuery(filters), responseType: 'blob' });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `cue_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;

    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function verifyIntegrity(): Promise<IntegrityCheckResult> {
  try {
    const { data } = await httpClient.get('/api/compliance/audit-log/verify');
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchComplianceModules(): Promise<ComplianceModuleOption[]> {
  try {
    const { data } = await httpClient.get('/api/compliance/modules');
    return data.modules;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchModuleVersions(): Promise<ModuleVersionFamily[]> {
  try {
    const { data } = await httpClient.get('/api/compliance/modules/versions');
    return data.families;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createNewModuleVersion(moduleId: string, version: string, slaDays?: number): Promise<void> {
  try {
    await httpClient.post(`/api/compliance/modules/${moduleId}/new-version`, { version, slaDays });
  } catch (err) {
    throw toApiError(err);
  }
}
