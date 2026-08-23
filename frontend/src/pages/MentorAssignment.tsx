import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { assignMentor, fetchAvailableMentors, fetchLeaderAssignments, fetchUnassignedJoinees } from '../api/mentorsApi';
import type { ApiClientError } from '../api/httpClient';
import type { AssignableJoinee, AssignableMentor, LeaderAssignmentRow } from '../types';

const STATUS_BADGE: Record<LeaderAssignmentRow['status'], string> = {
  on_track: 'badge-on-track',
  overdue: 'badge-overdue',
  complete: 'badge-completed',
};
const STATUS_LABEL: Record<LeaderAssignmentRow['status'], string> = {
  on_track: 'On Track',
  overdue: 'Overdue',
  complete: 'Complete',
};

export default function MentorAssignment() {
  const [joinees, setJoinees] = useState<AssignableJoinee[]>([]);
  const [mentors, setMentors] = useState<AssignableMentor[]>([]);
  const [assignments, setAssignments] = useState<LeaderAssignmentRow[]>([]);
  const [selectedJoinee, setSelectedJoinee] = useState('');
  const [selectedMentor, setSelectedMentor] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([fetchUnassignedJoinees(), fetchAvailableMentors(), fetchLeaderAssignments()])
      .then(([j, m, a]) => {
        setJoinees(j);
        setMentors(m);
        setAssignments(a);
        setSelectedJoinee((prev) => (j.some((x) => x.id === prev) ? prev : (j[0]?.id ?? '')));
        setSelectedMentor((prev) => (m.some((x) => x.id === prev) ? prev : (m[0]?.id ?? '')));
      })
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!selectedJoinee || !selectedMentor) return;
    setAssigning(true);
    setError(null);
    setSuccess(null);
    try {
      await assignMentor(selectedMentor, selectedJoinee);
      setSuccess('Mentor assigned.');
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
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="h1">Mentor Assignment</h1>
        <p className="mt-1 text-sm text-brand-muted">Pair new joinees with a mentor and track collaboration progress.</p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <form onSubmit={handleAssign} className="card mt-6">
          <h2 className="h3">Assign a mentor</h2>
          {success && <p className="mt-2 text-sm font-medium text-brand-green">{success}</p>}

          {loading ? (
            <div className="mt-4 flex justify-center">
              <Spinner className="h-5 w-5" />
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="joinee">
                  New joinee
                </label>
                <select id="joinee" value={selectedJoinee} onChange={(e) => setSelectedJoinee(e.target.value)} className="input-field">
                  {joinees.length === 0 && <option value="">No unassigned joinees</option>}
                  {joinees.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="mentor">
                  Mentor
                </label>
                <select id="mentor" value={selectedMentor} onChange={(e) => setSelectedMentor(e.target.value)} className="input-field">
                  {mentors.length === 0 && <option value="">No mentors in LOB</option>}
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.menteeCount} mentee{m.menteeCount === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={assigning || !selectedJoinee || !selectedMentor}
                  className="btn-primary w-full"
                >
                  {assigning && <Spinner className="h-4 w-4 text-brand-black" />}
                  {assigning ? 'Assigning…' : 'Assign Mentor'}
                </button>
              </div>
            </div>
          )}
        </form>

        <section className="mt-8">
          <h2 className="h3">Assignments</h2>
          {loading ? (
            <div className="mt-4 flex justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="mt-3 text-sm text-brand-muted">No mentor assignments yet.</p>
          ) : (
            <div className="table-wrap mt-3">
              <table className="min-w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">New Joinee</th>
                    <th className="px-4 py-3">Mentor</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="table-row">
                      <td className="px-4 py-3 font-medium text-white">{a.menteeName}</td>
                      <td className="px-4 py-3 text-brand-muted">{a.mentorName}</td>
                      <td className="px-4 py-3 text-brand-muted">{new Date(a.assignedDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-mono text-brand-green">
                        {a.sessionsCompleted} of {a.totalSessions}
                      </td>
                      <td className="px-4 py-3">
                        <span className={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
