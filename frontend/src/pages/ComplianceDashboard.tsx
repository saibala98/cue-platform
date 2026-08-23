import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { fetchComplianceSummary, verifyIntegrity } from '../api/complianceApi';
import type { ApiClientError } from '../api/httpClient';
import type { ComplianceSummaryData, IntegrityCheckResult } from '../types';

export default function ComplianceDashboard() {
  const [summary, setSummary] = useState<ComplianceSummaryData | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([fetchComplianceSummary(), verifyIntegrity()])
      .then(([s, i]) => {
        setSummary(s);
        setIntegrity(i);
      })
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleIntegrityCheck() {
    setChecking(true);
    setError(null);
    try {
      setIntegrity(await verifyIntegrity());
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setChecking(false);
    }
  }

  const cards = summary
    ? [
        { label: 'Total completion records', value: summary.totalRecords },
        { label: 'Completions this month', value: summary.completionsThisMonth },
        { label: 'Pass rate (≥ 70%)', value: summary.passRate === null ? '—' : `${summary.passRate}%` },
        { label: 'Modules at 100% completion', value: summary.modulesFullyComplete },
        { label: 'Overdue alerts', value: summary.overdueCount, alert: summary.overdueCount > 0 },
      ]
    : [];

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="h1">Compliance Dashboard</h1>
            <p className="mt-1 text-sm text-brand-muted">Org-wide training completion, integrity, and audit readiness.</p>
          </div>

          {integrity && (
            <div className="group relative">
              <span
                className={`badge cursor-default ${integrity.verified ? 'bg-brand-green text-brand-black' : 'badge-overdue'}`}
              >
                {integrity.verified ? 'Verified Immutable' : 'Integrity check failed'}
              </span>
              <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-brand-border bg-brand-surface p-3 text-xs text-brand-muted opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                These records cannot be edited or deleted. Enforced by a database trigger on <span className="font-mono text-brand-pink">completion_records</span>.
                <br />
                Last checked: {new Date(integrity.checkedAt).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {cards.map((card) => (
                <div key={card.label} className={`rounded-xl border bg-brand-dark p-4 ${card.alert ? 'border-brand-pink' : 'border-brand-green'}`}>
                  <p className={`text-3xl font-bold ${card.alert ? 'text-brand-pink' : 'text-brand-green'}`}>{card.value}</p>
                  <p className="mt-1 text-xs text-brand-muted">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void handleIntegrityCheck()} disabled={checking} className="btn-secondary">
                {checking && <Spinner className="h-4 w-4 text-brand-pink" />}
                {checking ? 'Checking…' : 'Run Integrity Check'}
              </button>
              <Link to="/audit-log" className="btn-primary">
                Open Audit Log
              </Link>
              <Link to="/module-versioning" className="btn-secondary">
                Module Versioning
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
