import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import DashboardSummary from '../components/dashboard/DashboardSummary';
import CompletionTable from '../components/dashboard/CompletionTable';
import MentorTable from '../components/dashboard/MentorTable';
import OverdueAlerts from '../components/dashboard/OverdueAlerts';
import {
  exportCompletionCsv,
  fetchCompletionTable,
  fetchDashboardModules,
  fetchDashboardSummary,
  fetchMentorTable,
  fetchOverdueItems,
  sendReminder,
} from '../api/leaderDashboardApi';
import { assignModuleToAll } from '../api/moduleAdminApi';
import type { ApiClientError } from '../api/httpClient';
import type {
  CompletionRow,
  DashboardModuleOption,
  DashboardSummaryData,
  MentorTableRow,
  OverdueItem,
  ReminderTargetType,
} from '../types';

export default function LeaderDashboard() {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [mentors, setMentors] = useState<MentorTableRow[]>([]);
  const [overdue, setOverdue] = useState<OverdueItem[]>([]);
  const [modules, setModules] = useState<DashboardModuleOption[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([fetchDashboardSummary(), fetchCompletionTable(), fetchMentorTable(), fetchOverdueItems(), fetchDashboardModules()])
      .then(([s, c, m, o, mods]) => {
        setSummary(s);
        setCompletions(c);
        setMentors(m);
        setOverdue(o);
        setModules(mods);
        setSelectedModuleId((prev) => (mods.some((mod) => mod.id === prev) ? prev : (mods[0]?.id ?? '')));
      })
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleReminder(targetType: ReminderTargetType, targetId: string) {
    await sendReminder(targetType, targetId);
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await exportCompletionCsv();
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setExporting(false);
    }
  }

  async function handleAssignToTeam() {
    if (!selectedModuleId) return;
    setAssigning(true);
    setAssignMessage(null);
    setError(null);
    try {
      await assignModuleToAll(selectedModuleId);
      setAssignMessage('Module assigned to all new joinees in your LOB.');
      load();
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="h1">Leader Dashboard</h1>
            <p className="mt-1 text-sm text-brand-muted">Everything you need to know about your team&rsquo;s onboarding, in one place.</p>
          </div>
          <button type="button" onClick={() => void handleExport()} disabled={exporting} className="btn-secondary">
            {exporting && <Spinner className="h-4 w-4 text-brand-pink" />}
            {exporting ? 'Exporting…' : 'Export to CSV'}
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {loading || !summary ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <div className="mt-6">
              <DashboardSummary data={summary} />
            </div>

            <section className="card mt-6">
              <h2 className="h3">Leader Actions</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link to="/module-admin" className="btn-primary px-4 py-2 text-sm">
                  Create New Module
                </Link>
                <Link to="/module-admin" className="btn-secondary px-4 py-2 text-sm">
                  View Module Analytics
                </Link>
                <div className="flex items-center gap-2 rounded-lg border border-brand-border p-1.5">
                  <select value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)} className="input-field w-56 border-none py-1">
                    {modules.length === 0 && <option value="">No modules yet</option>}
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} (v{m.version})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={assigning || !selectedModuleId}
                    onClick={() => void handleAssignToTeam()}
                    className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                  >
                    {assigning && <Spinner className="h-3.5 w-3.5 text-brand-pink" />}
                    Assign Module to Team
                  </button>
                </div>
              </div>
              {assignMessage && <p className="mt-2 text-sm font-medium text-brand-green">{assignMessage}</p>}
            </section>

            <section className="mt-8">
              <h2 className="h3">Overdue Alerts</h2>
              <div className="mt-3">
                <OverdueAlerts items={overdue} onSendReminder={handleReminder} />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="h3">Training Completion</h2>
              <div className="mt-3">
                <CompletionTable rows={completions} />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="h3">Mentor Assignments</h2>
              <div className="mt-3">
                <MentorTable rows={mentors} />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
