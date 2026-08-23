import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';
import { DEMO_LOGIN_USERS } from '../demo/mockData';
import { DEMO_PASSWORD, DEMO_STORAGE_KEYS } from '../demo/demoMode';
import type { ApiClientError } from '../api/httpClient';
import type { UserRole } from '../types';

const ROLE_META: Record<UserRole, { label: string; blurb: string }> = {
  new_joinee: { label: 'New Joinee', blurb: 'Training modules, mentor checklist, Knowledge Buddy chat' },
  mentor: { label: 'Mentor', blurb: 'Mentee checklists and collaboration sessions' },
  people_leader: { label: 'People Leader', blurb: 'Team dashboard, module admin, knowledge map' },
  compliance_admin: { label: 'Compliance Admin', blurb: 'Audit log, integrity checks, module versioning' },
};

export default function DemoLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justReset, setJustReset] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DEMO_STORAGE_KEYS.justReset)) {
        setJustReset(true);
        sessionStorage.removeItem(DEMO_STORAGE_KEYS.justReset);
      }
    } catch {
      // ignore
    }
  }, []);

  async function loginAs(email: string, id: string) {
    setPending(id);
    setError(null);
    try {
      await login(email, DEMO_PASSWORD);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-brand-green">CUE</h1>
          <p className="mt-1 text-sm text-brand-muted">AI Onboarding &amp; Knowledge Buddy</p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/60 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            DEMO MODE
          </span>
        </div>

        <div className="card space-y-4">
          {justReset && (
            <div className="rounded-lg border border-brand-green/40 bg-brand-green/5 px-3 py-2 text-xs text-brand-green">Demo has been reset.</div>
          )}
          {error && <ErrorBanner message={error} />}

          <p className="text-center text-sm text-brand-muted">Pick a role to explore CUE. This is a demo — no real data is stored, no account needed.</p>

          <div className="space-y-2.5">
            {DEMO_LOGIN_USERS.map((u) => {
              const meta = ROLE_META[u.role];
              const isPending = pending === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void loginAs(u.email, u.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-surface px-4 py-3 text-left transition duration-150 hover:border-brand-green hover:shadow-neon-green-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      Login as {meta.label} <span className="font-normal text-brand-faint">&middot; {u.firstName} {u.lastName}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-brand-muted">{meta.blurb}</span>
                  </span>
                  {isPending && <Spinner className="h-4 w-4 shrink-0 text-brand-green" />}
                </button>
              );
            })}
          </div>

          <p className="text-center text-[11px] text-brand-faint">
            All demo data resets when you use the &ldquo;Reset Demo&rdquo; button — nothing you do here is saved anywhere.
          </p>
        </div>
      </div>
    </div>
  );
}
