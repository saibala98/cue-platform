import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ErrorBanner from '../components/ErrorBanner';
import Spinner from '../components/Spinner';
import type { ApiClientError } from '../api/httpClient';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-brand-green">CUE</h1>
          <p className="mt-1 text-sm text-brand-muted">AI Onboarding &amp; Knowledge Buddy</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <ErrorBanner message={error} />}

          <div>
            <label className="label" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting && <Spinner className="h-4 w-4 text-brand-black" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-brand-muted">
            New here?{' '}
            <Link to="/register" className="font-medium text-brand-green hover:text-brand-pink">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
