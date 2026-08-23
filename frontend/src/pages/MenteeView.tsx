import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { fetchMyAssignment } from '../api/mentorsApi';
import type { ApiClientError } from '../api/httpClient';
import type { MyMentorAssignment } from '../types';

const STATUS_BADGE: Record<MyMentorAssignment['status'], string> = {
  on_track: 'badge-on-track',
  overdue: 'badge-overdue',
  complete: 'badge-completed',
};
const STATUS_LABEL: Record<MyMentorAssignment['status'], string> = {
  on_track: 'On Track',
  overdue: 'Overdue',
  complete: 'Complete',
};

export default function MenteeView() {
  const [assignment, setAssignment] = useState<MyMentorAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyAssignment()
      .then(setAssignment)
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="h1">My Mentor</h1>
        <p className="mt-1 text-sm text-brand-muted">Your assigned mentor and shared collaboration checklist.</p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : !assignment ? (
          <p className="mt-8 text-sm text-brand-muted">You don&rsquo;t have a mentor assigned yet — your people leader will assign one soon.</p>
        ) : (
          <div className="card-active mt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-brand-faint">Your mentor</p>
                <h2 className="h2 mt-1">{assignment.mentor?.name}</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  {assignment.mentor?.role.replace('_', ' ')} · {assignment.mentor?.email}
                </p>
              </div>
              <span className={STATUS_BADGE[assignment.status]}>{STATUS_LABEL[assignment.status]}</span>
            </div>

            <p className="mt-4 text-xs font-medium text-brand-green">
              {assignment.sessionsCompleted} of {assignment.totalSessions} sessions complete
            </p>
            <div className="progress-track mt-2">
              <div className="progress-fill" style={{ width: `${(assignment.sessionsCompleted / assignment.totalSessions) * 100}%` }} />
            </div>

            <Link to={`/collaboration-checklist/${assignment.id}`} className="btn-primary mt-5 inline-flex">
              Open collaboration checklist
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
