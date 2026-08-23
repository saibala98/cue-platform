import { useState } from 'react';
import type { FormEvent } from 'react';
import Spinner from '../Spinner';
import ErrorBanner from '../ErrorBanner';
import { askTutor } from '../../api/aiApi';
import type { ApiClientError } from '../../api/httpClient';

interface Props {
  moduleId: string;
  quizQuestionId: string;
  questionText: string;
  onClose: () => void;
}

export default function CourseAskAI({ moduleId, quizQuestionId, questionText, onClose }: Props) {
  const [message, setMessage] = useState(`I'm stuck on: ${questionText}`);
  const [asking, setAsking] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || asking) return;
    setAsking(true);
    setError(null);
    setHint(null);
    try {
      const answer = await askTutor(moduleId, message.trim(), quizQuestionId);
      setHint(answer.content);
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-brand-black/70 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-brand-border bg-brand-dark p-5">
        <div className="flex items-center justify-between">
          <h2 className="h3">Ask Knowledge Buddy</h2>
          <button type="button" onClick={onClose} className="btn-secondary px-2.5 py-1 text-xs">
            Close
          </button>
        </div>
        <p className="mt-1 text-xs text-brand-faint">I&rsquo;ll give you a hint using this module&rsquo;s lessons — not the answer.</p>

        {error && (
          <div className="mt-3">
            <ErrorBanner message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="input-field" />
          <button type="submit" disabled={asking || !message.trim()} className="btn-primary mt-2 w-full">
            {asking && <Spinner className="h-4 w-4 text-brand-black" />}
            {asking ? 'Thinking…' : 'Get a hint'}
          </button>
        </form>

        {hint && (
          <div className="mt-4 rounded-lg border border-brand-pink/30 bg-brand-pink/5 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">{hint}</p>
          </div>
        )}
      </div>
    </div>
  );
}
