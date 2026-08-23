import { useEffect, useMemo, useState } from 'react';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import KnowledgeMapForm from '../components/knowledgeMap/KnowledgeMapForm';
import {
  createKnowledgeMapEntry,
  deleteKnowledgeMapEntry,
  fetchKnowledgeMapEntries,
  updateKnowledgeMapEntry,
} from '../api/knowledgeMapApi';
import type { ApiClientError } from '../api/httpClient';
import type { KnowledgeMapEntry, KnowledgeMapEntryInput } from '../types';

type SortKey = 'topic' | 'ownerName' | 'goToContactName' | 'approverName' | 'lastUpdatedByName' | 'lastUpdatedAt';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'topic', label: 'Topic' },
  { key: 'ownerName', label: 'Owner' },
  { key: 'goToContactName', label: 'Go-To Contact' },
  { key: 'approverName', label: 'Approver' },
  { key: 'lastUpdatedByName', label: 'Last Updated By' },
  { key: 'lastUpdatedAt', label: 'Last Updated' },
];

export default function KnowledgeMapAdmin() {
  const [entries, setEntries] = useState<KnowledgeMapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('topic');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeMapEntry | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    fetchKnowledgeMapEntries()
      .then(setEntries)
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

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
    return entries
      .filter((e) => (term ? `${e.topic} ${e.ownerName} ${e.goToContactName}`.toLowerCase().includes(term) : true))
      .sort((a, b) => {
        const av = (a[sortKey] ?? '') as string;
        const bv = (b[sortKey] ?? '') as string;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [entries, search, sortKey, sortDir]);

  function openAddForm() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEditForm(entry: KnowledgeMapEntry) {
    setEditing(entry);
    setFormOpen(true);
  }

  async function handleFormSubmit(input: KnowledgeMapEntryInput) {
    if (editing) {
      await updateKnowledgeMapEntry(editing.id, input);
    } else {
      await createKnowledgeMapEntry(input);
    }
    setFormOpen(false);
    setEditing(null);
    load();
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setError(null);
    try {
      await deleteKnowledgeMapEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="h1">Knowledge Map</h1>
            <p className="mt-1 text-sm text-brand-muted">Tribal knowledge — who owns a process, who to contact, who approves.</p>
          </div>
          <button type="button" onClick={openAddForm} className="btn-primary">
            + Add Entry
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <div className="mt-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic, owner, or contact..."
            className="input-field w-72"
          />
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <div className="table-wrap mt-4">
            <table className="min-w-full text-sm">
              <thead className="table-head">
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="cursor-pointer select-none px-4 py-3 hover:text-white" onClick={() => toggleSort(col.key)}>
                      {col.label}
                      {sortKey === col.key && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                  ))}
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-6 text-center text-brand-muted">
                      No entries match.
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry) => (
                    <tr key={entry.id} className="table-row">
                      <td className="px-4 py-3 font-medium text-white">{entry.topic}</td>
                      <td className="px-4 py-3 text-brand-muted">{entry.ownerName}</td>
                      <td className="px-4 py-3 text-brand-muted">
                        {entry.goToContactName}
                        {entry.goToContactRole && <span className="text-brand-faint"> · {entry.goToContactRole}</span>}
                      </td>
                      <td className="px-4 py-3 text-brand-muted">{entry.approverName ?? '—'}</td>
                      <td className="px-4 py-3 text-brand-muted">{entry.lastUpdatedByName ?? '—'}</td>
                      <td className="px-4 py-3 text-brand-muted">{new Date(entry.lastUpdatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openEditForm(entry)} className="btn-secondary px-2.5 py-1 text-xs">
                            Edit
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(entry.id)} className="btn-danger px-2.5 py-1 text-xs">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {formOpen && (
        <KnowledgeMapForm
          initialData={editing ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="absolute inset-0 bg-brand-black/80 backdrop-blur-sm" />
          <div onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-sm rounded-xl border border-brand-pink bg-brand-dark p-6">
            <h2 className="h3 text-brand-pink">Delete this entry?</h2>
            <p className="mt-2 text-sm text-brand-muted">
              This removes &ldquo;{entries.find((e) => e.id === confirmDeleteId)?.topic}&rdquo; from the knowledge map. This can&rsquo;t be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDeleteId(null)} className="btn-secondary">
                Cancel
              </button>
              <button type="button" disabled={deleting} onClick={() => void handleDelete(confirmDeleteId)} className="btn-danger">
                {deleting && <Spinner className="h-4 w-4 text-white" />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
