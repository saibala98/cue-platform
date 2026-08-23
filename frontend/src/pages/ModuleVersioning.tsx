import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { createNewModuleVersion, fetchModuleVersions } from '../api/complianceApi';
import type { ApiClientError } from '../api/httpClient';
import type { ModuleVersionFamily } from '../types';

export default function ModuleVersioning() {
  const [families, setFamilies] = useState<ModuleVersionFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openFamilyId, setOpenFamilyId] = useState<string | null>(null);
  const [versionDraft, setVersionDraft] = useState('');
  const [slaDraft, setSlaDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchModuleVersions()
      .then(setFamilies)
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openForm(family: ModuleVersionFamily) {
    setOpenFamilyId(family.familyId);
    setVersionDraft('');
    setSlaDraft('');
    setCreateError(null);
  }

  async function handleCreateVersion(e: FormEvent, moduleId: string) {
    e.preventDefault();
    if (!versionDraft.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createNewModuleVersion(moduleId, versionDraft.trim(), slaDraft ? Number(slaDraft) : undefined);
      setOpenFamilyId(null);
      load();
    } catch (err) {
      setCreateError((err as ApiClientError).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="h1">Module Versioning</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Every module keeps its full version history. Completion records permanently store the version an employee actually
          completed, even after a newer version replaces it.
        </p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : families.length === 0 ? (
          <p className="mt-8 text-sm text-brand-muted">No modules exist yet.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {families.map((family) => (
              <li key={family.familyId} className="card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-medium text-white">{family.title}</h2>
                    <p className="mt-1 text-xs text-brand-faint">
                      Current version: <span className="mono">{family.currentVersion}</span>
                    </p>
                  </div>
                  <button type="button" onClick={() => openForm(family)} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                    Create New Version
                  </button>
                </div>

                <ul className="mt-3 divide-y divide-brand-border">
                  {family.versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-brand-pink">{v.version}</span>
                        {!v.isArchived && <span className="badge-completed">Current</span>}
                        {v.isArchived && <span className="badge-not-started">Archived</span>}
                      </div>
                      <span className="text-xs text-brand-faint">
                        SLA {v.slaDays}d · created {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>

                {openFamilyId === family.familyId && (
                  <form onSubmit={(e) => void handleCreateVersion(e, family.currentVersionId)} className="mt-4 border-t border-brand-border pt-4">
                    {createError && (
                      <div className="mb-3">
                        <ErrorBanner message={createError} />
                      </div>
                    )}
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label className="label" htmlFor={`version-${family.familyId}`}>
                          New version
                        </label>
                        <input
                          id={`version-${family.familyId}`}
                          value={versionDraft}
                          onChange={(e) => setVersionDraft(e.target.value)}
                          placeholder="e.g. 2026.2"
                          className="input-field font-mono"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor={`sla-${family.familyId}`}>
                          SLA days (optional)
                        </label>
                        <input
                          id={`sla-${family.familyId}`}
                          type="number"
                          min={1}
                          value={slaDraft}
                          onChange={(e) => setSlaDraft(e.target.value)}
                          className="input-field w-28"
                        />
                      </div>
                      <button type="submit" disabled={creating || !versionDraft.trim()} className="btn-primary">
                        {creating && <Spinner className="h-4 w-4 text-brand-black" />}
                        {creating ? 'Creating…' : 'Create'}
                      </button>
                      <button type="button" onClick={() => setOpenFamilyId(null)} className="btn-secondary">
                        Cancel
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-brand-faint">
                      Lessons and quiz questions are copied forward from the current version. The old version is archived and
                      keeps working for anyone already assigned it — only new joinees get the new version automatically.
                    </p>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
