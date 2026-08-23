import { useMemo, useState } from 'react';
import type { CompletionRow, CompletionStatus } from '../../types';

interface Props {
  rows: CompletionRow[];
}

type SortKey = 'employeeName' | 'moduleName' | 'moduleVersion' | 'assignedDate' | 'dueDate' | 'completionDate' | 'score' | 'status';

const STATUS_BADGE: Record<CompletionStatus, string> = {
  completed: 'badge-completed',
  in_progress: 'badge-in-progress',
  overdue: 'badge-overdue',
  not_started: 'badge-not-started',
};
const STATUS_LABEL: Record<CompletionStatus, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  overdue: 'Overdue',
  not_started: 'Not Started',
};

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'employeeName', label: 'Employee Name' },
  { key: 'moduleName', label: 'Module Name' },
  { key: 'moduleVersion', label: 'Version' },
  { key: 'assignedDate', label: 'Assigned Date' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'completionDate', label: 'Completion' },
  { key: 'score', label: 'Score' },
  { key: 'status', label: 'Status' },
];

function sortValue(row: CompletionRow, key: SortKey): string | number {
  switch (key) {
    case 'assignedDate':
    case 'dueDate':
      return new Date(row[key]).getTime();
    case 'completionDate':
      return row.completionDate ? new Date(row.completionDate).getTime() : -Infinity;
    case 'score':
      return row.score ?? -1;
    default:
      return row[key];
  }
}

export default function CompletionTable({ rows }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CompletionStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => (term ? r.employeeName.toLowerCase().includes(term) : true))
      .sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [rows, search, statusFilter, sortKey, sortDir]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by employee name..."
          className="input-field w-56"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CompletionStatus | 'all')} className="input-field w-44">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="overdue">Overdue</option>
          <option value="not_started">Not Started</option>
        </select>
        <span className="text-xs text-brand-faint">{filtered.length} of {rows.length} rows</span>
      </div>

      <div className="table-wrap mt-3">
        <table className="min-w-full text-sm">
          <thead className="table-head">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className="cursor-pointer select-none px-4 py-3 hover:text-white" onClick={() => toggleSort(col.key)}>
                  {col.label}
                  {sortKey === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-6 text-center text-brand-muted">
                  No matching rows.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={`${r.moduleAssignmentId}`} className="table-row">
                  <td className="px-4 py-3 font-medium text-white">{r.employeeName}</td>
                  <td className="px-4 py-3 text-brand-muted">{r.moduleName}</td>
                  <td className="px-4 py-3 font-mono text-brand-pink">{r.moduleVersion}</td>
                  <td className="px-4 py-3 text-brand-muted">{new Date(r.assignedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-brand-muted">{new Date(r.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-brand-muted">
                    {r.completionDate ? new Date(r.completionDate).toLocaleDateString() : STATUS_LABEL[r.status]}
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{r.score ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
