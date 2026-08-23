import { useState } from 'react';
import type { FormEvent } from 'react';
import Spinner from '../Spinner';
import ErrorBanner from '../ErrorBanner';
import type { ApiClientError } from '../../api/httpClient';
import type { KnowledgeMapEntry, KnowledgeMapEntryInput } from '../../types';

interface Props {
  initialData?: KnowledgeMapEntry;
  onSubmit: (input: KnowledgeMapEntryInput) => Promise<void>;
  onCancel: () => void;
}

export default function KnowledgeMapForm({ initialData, onSubmit, onCancel }: Props) {
  const [topic, setTopic] = useState(initialData?.topic ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [ownerName, setOwnerName] = useState(initialData?.ownerName ?? '');
  const [ownerEmail, setOwnerEmail] = useState(initialData?.ownerEmail ?? '');
  const [goToContactName, setGoToContactName] = useState(initialData?.goToContactName ?? '');
  const [goToContactEmail, setGoToContactEmail] = useState(initialData?.goToContactEmail ?? '');
  const [goToContactRole, setGoToContactRole] = useState(initialData?.goToContactRole ?? '');
  const [approverName, setApproverName] = useState(initialData?.approverName ?? '');
  const [approverEmail, setApproverEmail] = useState(initialData?.approverEmail ?? '');
  const [approverRole, setApproverRole] = useState(initialData?.approverRole ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !ownerName.trim() || !goToContactName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        topic: topic.trim(),
        description: description.trim() || undefined,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim() || undefined,
        goToContactName: goToContactName.trim(),
        goToContactEmail: goToContactEmail.trim() || undefined,
        goToContactRole: goToContactRole.trim() || undefined,
        approverName: approverName.trim() || undefined,
        approverEmail: approverEmail.trim() || undefined,
        approverRole: approverRole.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError((err as ApiClientError).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-brand-black/80 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-brand-border bg-brand-dark p-6"
      >
        <h2 className="h3">{initialData ? 'Edit Entry' : 'Add Knowledge Map Entry'}</h2>

        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} />
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="topic">
              Topic *
            </label>
            <input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} required className="input-field" />
          </div>

          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input-field" />
          </div>

          <div className="rounded-lg border border-brand-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">Owner</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input placeholder="Name *" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="input-field" />
              <input placeholder="Email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="rounded-lg border border-brand-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green">Go-To Contact</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                placeholder="Name *"
                value={goToContactName}
                onChange={(e) => setGoToContactName(e.target.value)}
                required
                className="input-field"
              />
              <input placeholder="Role" value={goToContactRole} onChange={(e) => setGoToContactRole(e.target.value)} className="input-field" />
              <input
                placeholder="Email"
                type="email"
                value={goToContactEmail}
                onChange={(e) => setGoToContactEmail(e.target.value)}
                className="input-field col-span-2"
              />
            </div>
          </div>

          <div className="rounded-lg border border-brand-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-pink">Approver (optional)</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input placeholder="Name" value={approverName} onChange={(e) => setApproverName(e.target.value)} className="input-field" />
              <input placeholder="Role" value={approverRole} onChange={(e) => setApproverRole(e.target.value)} className="input-field" />
              <input
                placeholder="Email"
                type="email"
                value={approverEmail}
                onChange={(e) => setApproverEmail(e.target.value)}
                className="input-field col-span-2"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-field" />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting || !topic.trim() || !ownerName.trim() || !goToContactName.trim()} className="btn-primary">
            {submitting && <Spinner className="h-4 w-4 text-brand-black" />}
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
