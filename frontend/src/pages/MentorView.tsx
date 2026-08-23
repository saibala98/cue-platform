import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { fetchMyMentees } from '../api/mentorsApi';
import type { ApiClientError } from '../api/httpClient';
import type { MyMenteeRow } from '../types';

const STATUS_BADGE: Record<MyMenteeRow['status'], string> = {
  on_track: 'badge-on-track',
  overdue: 'badge-overdue',
  complete: 'badge-completed',
};
const STATUS_LABEL: Record<MyMenteeRow['status'], string> = {
  on_track: 'On Track',
  overdue: 'Overdue',
  complete: 'Complete',
};

export default function MentorView() {
  const [mentees, setMentees] = useState<MyMenteeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyMentees()
      .then(setMentees)
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="h1">My Mentees</h1>
        <p className="mt-1 text-sm text-brand-muted">Your assigned new joinees and their collaboration progress.</p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : mentees.length === 0 ? (
          <p className="mt-8 text-sm text-brand-muted">You don&rsquo;t have any mentees assigned yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {mentees.map((m) => (
              <li key={m.assignmentId} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium text-white">{m.menteeName}</h2>
                      <span className={STATUS_BADGE[m.status]}>{STATUS_LABEL[m.status]}</span>
                    </div>
                    <p className="mt-1 text-xs text-brand-faint">{m.menteeEmail}</p>
                    <p className="mt-2 text-xs text-brand-muted">
                      <span className="font-mono text-brand-green">
                        {m.sessionsCompleted}/{m.totalSessions}
                      </span>{' '}
                      collaboration sessions ·{' '}
                      <span className="font-mono text-brand-pink">
                        {m.modulesCompleted}/{m.modulesAssigned}
                      </span>{' '}
                      training modules complete
                    </p>
                  </div>
                  <Link to={`/collaboration-checklist/${m.assignmentId}`} className="btn-primary shrink-0 px-3 py-1.5 text-xs">
                    Open checklist
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
