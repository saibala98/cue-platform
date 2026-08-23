import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { completeSession, fetchChecklist } from '../api/mentorsApi';
import type { ApiClientError } from '../api/httpClient';
import type { ChecklistAssignment, CollaborationSession } from '../types';

const STATUS_BADGE: Record<ChecklistAssignment['status'], string> = {
  on_track: 'badge-on-track',
  overdue: 'badge-overdue',
  complete: 'badge-completed',
};
const STATUS_LABEL: Record<ChecklistAssignment['status'], string> = {
  on_track: 'On Track',
  overdue: 'Overdue',
  complete: 'Complete',
};

function countdownLabel(dueDate: string): string {
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}

export default function CollaborationChecklist() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [assignment, setAssignment] = useState<ChecklistAssignment | null>(null);
  const [sessions, setSessions] = useState<CollaborationSession[]>([]);
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingSession, setSavingSession] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!assignmentId) return;
    setLoading(true);
    setError(null);
    fetchChecklist(assignmentId)
      .then((data) => {
        setAssignment(data.assignment);
        setSessions(data.sessions);
      })
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [assignmentId]);

  async function handleComplete(sessionNumber: number) {
    if (!assignmentId) return;
    setSavingSession(sessionNumber);
    setError(null);
    try {
      await completeSession(assignmentId, sessionNumber, notesDraft[sessionNumber]);
      load();
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setSavingSession(null);
    }
  }

  if (loading) {
    return (
      <div className="page-bg min-h-screen">
        <Nav />
        <div className="flex justify-center py-20">
          <Spinner className="h-6 w-6" />
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="page-bg min-h-screen">
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <ErrorBanner message={error} />
          <Link to="/dashboard" className="btn-secondary mt-4 inline-flex">
            Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  if (!assignment) return null;

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="h1">Collaboration Checklist</h1>
        <p className="mt-1 text-sm text-brand-muted">
          {assignment.mentorName} &amp; {assignment.menteeName}
        </p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <div className="card mt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-brand-green">
              {assignment.sessionsCompleted} of {assignment.totalSessions} sessions complete
            </p>
            <span className={STATUS_BADGE[assignment.status]}>{STATUS_LABEL[assignment.status]}</span>
          </div>
          <div className="progress-track mt-3">
            <div className="progress-fill" style={{ width: `${(assignment.sessionsCompleted / assignment.totalSessions) * 100}%` }} />
          </div>
        </div>

        <ul className="mt-6 space-y-3">
          {sessions.map((s) => (
            <li key={s.sessionNumber} className={s.completedAt ? 'session-card-complete' : 'session-card'}>
              <div className="flex items-start gap-3">
                <span className={s.completedAt ? 'checkbox-dot-checked mt-0.5' : 'checkbox-dot mt-0.5'}>
                  {s.completedAt && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                      <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium text-white">
                      Session {s.sessionNumber}: {s.title}
                    </h2>
                    {s.dueDate && !s.completedAt && (
                      <span className={new Date(s.dueDate) < new Date() ? 'badge-overdue' : 'badge-on-track'}>{countdownLabel(s.dueDate)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-brand-muted">{s.description}</p>

                  {s.completedAt ? (
                    <p className="mt-2 text-xs font-medium text-brand-green">
                      Completed {new Date(s.completedAt).toLocaleDateString()} by {s.completedByName}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-brand-faint">Not yet completed</p>
                  )}
                  {s.notes && <p className="mt-2 rounded-lg bg-brand-surface p-3 text-sm text-brand-muted">“{s.notes}”</p>}

                  {!s.completedAt && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={notesDraft[s.sessionNumber] ?? ''}
                        onChange={(e) => setNotesDraft((prev) => ({ ...prev, [s.sessionNumber]: e.target.value }))}
                        placeholder="What did we cover?"
                        rows={2}
                        className="input-field"
                      />
                      <button
                        type="button"
                        disabled={savingSession === s.sessionNumber}
                        onClick={() => void handleComplete(s.sessionNumber)}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        {savingSession === s.sessionNumber && <Spinner className="h-3.5 w-3.5 text-brand-black" />}
                        Mark session complete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
