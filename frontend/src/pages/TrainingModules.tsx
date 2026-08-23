import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { fetchAssignedModules } from '../api/modulesApi';
import type { ApiClientError } from '../api/httpClient';
import type { AssignedModule } from '../types';

const STATUS_LABEL: Record<AssignedModule['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

function statusBadgeClass(m: AssignedModule): string {
  if (m.overdue) return 'badge-overdue';
  if (m.status === 'completed') return 'badge-completed';
  if (m.status === 'in_progress') return 'badge-in-progress';
  return 'badge-not-started';
}

export default function TrainingModules() {
  const [modules, setModules] = useState<AssignedModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignedModules()
      .then(setModules)
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="h1">Training</h1>
        <p className="mt-1 text-sm text-brand-muted">Complete each module by its due date to stay on track for onboarding.</p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : modules.length === 0 ? (
          <p className="mt-8 text-sm text-brand-muted">No training modules are assigned to you yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {modules.map((m) => (
              <li key={m.moduleId} className={m.status === 'completed' ? 'card-active' : 'card'}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium text-white">{m.title}</h2>
                      <span className="mono rounded-full bg-brand-surface px-2 py-0.5 text-xs">v{m.version}</span>
                      <span className={statusBadgeClass(m)}>{m.overdue ? 'Overdue' : STATUS_LABEL[m.status]}</span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-brand-faint">
                      {m.lobName} · Due {new Date(m.dueDate).toLocaleDateString()}
                    </p>
                    {m.status === 'completed' && (
                      <p className="mt-2 text-xs font-medium text-brand-green">
                        Completed {m.completedAt ? new Date(m.completedAt).toLocaleDateString() : ''}
                        {m.score !== null ? ` · score ${m.score}%` : ''}
                      </p>
                    )}
                  </div>
                  <Link to={`/training/${m.moduleId}`} className={m.status === 'completed' ? 'btn-secondary shrink-0 px-3 py-1.5 text-xs' : 'btn-primary shrink-0 px-3 py-1.5 text-xs'}>
                    {m.status === 'completed' ? 'Review' : m.status === 'in_progress' ? 'Continue' : 'Start'}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
