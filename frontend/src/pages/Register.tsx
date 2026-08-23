import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchLobs } from '../api/lobApi';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';
import type { ApiClientError } from '../api/httpClient';
import type { Lob, UserRole } from '../types';
import { USER_ROLES } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  new_joinee: 'New Joinee',
  mentor: 'Mentor',
  people_leader: 'People Leader',
  compliance_admin: 'Compliance Admin',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [lobs, setLobs] = useState<Lob[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('new_joinee');
  const [lobId, setLobId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLobs()
      .then((data) => {
        setLobs(data);
        if (data.length > 0) setLobId(data[0].id);
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim(), role, lobId: lobId || undefined });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-brand-green">CUE</h1>
          <p className="mt-1 text-sm text-brand-muted">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <ErrorBanner message={error} />}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="firstName">
                First name
              </label>
              <input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label" htmlFor="lastName">
                Last name
              </label>
              <input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-field" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="email">
              Work email
            </label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="input-field">
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="lob">
              Line of Business
            </label>
            <select id="lob" value={lobId} onChange={(e) => setLobId(e.target.value)} className="input-field">
              {lobs.length === 0 && <option value="">No LOBs available</option>}
              {lobs.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Spinner className="h-4 w-4 text-brand-black" />}
            {submitting ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-brand-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-green hover:text-brand-pink">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
