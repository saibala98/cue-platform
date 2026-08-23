import { useEffect, useState } from 'react';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import AuditExport from '../components/compliance/AuditExport';
import { fetchAuditLog, fetchComplianceModules, verifyIntegrity } from '../api/complianceApi';
import { fetchLobs } from '../api/lobApi';
import type { ApiClientError } from '../api/httpClient';
import type { AuditFilters, AuditRow, ComplianceModuleOption, IntegrityCheckResult, Lob } from '../types';

const EMPTY_FILTERS: AuditFilters = { status: 'all' };

export default function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [lobs, setLobs] = useState<Lob[]>([]);
  const [modules, setModules] = useState<ComplianceModuleOption[]>([]);
  const [integrity, setIntegrity] = useState<IntegrityCheckResult | null>(null);
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchLobs(), fetchComplianceModules(), verifyIntegrity()])
      .then(([l, m, i]) => {
        setLobs(l);
        setModules(m);
        setIntegrity(i);
      })
      .catch(() => undefined);
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    fetchAuditLog(filters)
      .then(setRows)
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [filters.lobId, filters.moduleId, filters.from, filters.to, filters.status]);

  // Search is debounced client-side via a separate trigger so we don't refetch on every keystroke.
  const [searchDraft, setSearchDraft] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setFilters((prev) => ({ ...prev, search: searchDraft || undefined })), 300);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="watermark-immutable mx-auto max-w-6xl px-4 py-10 sm:px-6 print:max-w-full">
        <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
          <div>
            <h1 className="h1">Compliance Audit Log</h1>
            <p className="mt-1 text-sm text-brand-muted">Immutable record of every training completion, org-wide.</p>
          </div>
          {integrity && (
            <span
              title="These records cannot be edited or deleted."
              className={`badge cursor-default ${integrity.verified ? 'bg-brand-green text-brand-black' : 'badge-overdue'}`}
            >
              {integrity.verified ? 'Verified Immutable' : 'Integrity check failed'}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 print:hidden">
            <ErrorBanner message={error} />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 print:hidden">
          <select
            value={filters.lobId ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, lobId: e.target.value || undefined }))}
            className="input-field w-44"
          >
            <option value="">All LOBs</option>
            {lobs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            value={filters.moduleId ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, moduleId: e.target.value || undefined }))}
            className="input-field w-56"
          >
            <option value="">All modules</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} (v{m.version})
              </option>
            ))}
          </select>
          <select
            value={filters.status ?? 'all'}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as AuditFilters['status'] }))}
            className="input-field w-36"
          >
            <option value="all">All scores</option>
            <option value="pass">Pass (≥70%)</option>
            <option value="fail">Fail (&lt;70%)</option>
          </select>
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value || undefined }))}
            className="input-field w-40"
          />
          <span className="text-xs text-brand-faint">to</span>
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value || undefined }))}
            className="input-field w-40"
          />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by employee name..."
            className="input-field w-56"
          />
        </div>

        <div className="mt-4 print:hidden">
          <AuditExport filters={filters} disabled={rows.length === 0} />
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <div className="table-wrap mt-6">
            <table className="min-w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Completed At</th>
                  <th className="px-4 py-3">LOB</th>
                  <th className="px-4 py-3">Days to Complete</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-brand-muted">
                      No records match these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="table-row">
                      <td className="px-4 py-3 font-medium text-white">{r.employeeName}</td>
                      <td className="px-4 py-3 text-brand-muted">{r.employeeEmail}</td>
                      <td className="px-4 py-3 text-brand-muted">{r.moduleTitle}</td>
                      <td className="px-4 py-3 font-mono text-brand-pink">{r.moduleVersion}</td>
                      <td className="px-4 py-3 text-brand-muted">{r.score ?? '-'}</td>
                      <td className="px-4 py-3 text-brand-muted">{new Date(r.completedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-brand-muted">{r.lobName}</td>
                      <td className="px-4 py-3 text-brand-muted">{r.daysToComplete ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
