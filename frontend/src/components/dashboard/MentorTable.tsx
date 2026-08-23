import type { CollaborationStatus, MentorTableRow } from '../../types';

interface Props {
  rows: MentorTableRow[];
}

const STATUS_BADGE: Record<CollaborationStatus, string> = {
  on_track: 'badge-on-track',
  overdue: 'badge-overdue',
  complete: 'badge-completed',
};
const STATUS_LABEL: Record<CollaborationStatus, string> = {
  on_track: 'On Track',
  overdue: 'Overdue',
  complete: 'Complete',
};

export default function MentorTable({ rows }: Props) {
  return (
    <div className="table-wrap">
      <table className="min-w-full text-sm">
        <thead className="table-head">
          <tr>
            <th className="px-4 py-3">New Joinee</th>
            <th className="px-4 py-3">Mentor</th>
            <th className="px-4 py-3">Assignment Date</th>
            <th className="px-4 py-3">Sessions Complete</th>
            <th className="px-4 py-3">Days Since Last Session</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-brand-muted">
                No mentor assignments yet.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.assignmentId} className="table-row">
                <td className="px-4 py-3 font-medium text-white">{r.menteeName}</td>
                <td className="px-4 py-3 text-brand-muted">{r.mentorName}</td>
                <td className="px-4 py-3 text-brand-muted">{new Date(r.assignedDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-mono text-brand-green">
                  {r.sessionsCompleted} of {r.totalSessions}
                </td>
                <td className="px-4 py-3 text-brand-muted">{r.daysSinceLastSession}d</td>
                <td className="px-4 py-3">
                  <span className={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
