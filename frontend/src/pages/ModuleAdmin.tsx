import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { assignModuleToAll, createModule, fetchAdminModules, fetchModuleCompletions } from '../api/moduleAdminApi';
import type { CreateModuleLessonInput, CreateModuleQuizInput } from '../api/moduleAdminApi';
import { fetchJoinees } from '../api/leaderApi';
import type { ApiClientError } from '../api/httpClient';
import type { AdminModuleCompletionRow, AdminModuleSummary, AssignableJoinee } from '../types';

const EMPTY_LESSON: CreateModuleLessonInput = { title: '', contentType: 'text', contentBody: '', contentUrl: '' };
const EMPTY_QUESTION: CreateModuleQuizInput = { questionText: '', options: ['', '', '', ''], correctIndex: 0 };

export default function ModuleAdmin() {
  const [modules, setModules] = useState<AdminModuleSummary[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [joinees, setJoinees] = useState<AssignableJoinee[]>([]);

  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('2026.1');
  const [slaDays, setSlaDays] = useState(7);
  const [lessons, setLessons] = useState<CreateModuleLessonInput[]>([{ ...EMPTY_LESSON }]);
  const [quizQuestions, setQuizQuestions] = useState<CreateModuleQuizInput[]>([
    { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] },
    { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] },
    { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] },
  ]);
  const [assignAll, setAssignAll] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [viewingModuleId, setViewingModuleId] = useState<string | null>(null);
  const [completions, setCompletions] = useState<AdminModuleCompletionRow[]>([]);
  const [loadingCompletions, setLoadingCompletions] = useState(false);

  const [assigningModuleId, setAssigningModuleId] = useState<string | null>(null);
  const [assignedModuleId, setAssignedModuleId] = useState<string | null>(null);

  function loadModules() {
    setLoadingModules(true);
    setListError(null);
    fetchAdminModules()
      .then(setModules)
      .catch((err) => setListError((err as ApiClientError).message))
      .finally(() => setLoadingModules(false));
  }

  useEffect(() => {
    loadModules();
    fetchJoinees()
      .then(setJoinees)
      .catch(() => undefined);
  }, []);

  function updateLesson(index: number, patch: Partial<CreateModuleLessonInput>) {
    setLessons((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function updateQuestion(index: number, patch: Partial<CreateModuleQuizInput>) {
    setQuizQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuizQuestions((prev) => prev.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q)));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!title.trim()) {
      setCreateError('Title is required');
      return;
    }
    if (lessons.some((l) => !l.title.trim() || (l.contentType === 'text' ? !l.contentBody?.trim() : !l.contentUrl?.trim()))) {
      setCreateError('Every lesson needs a title and content');
      return;
    }
    if (quizQuestions.some((q) => !q.questionText.trim() || q.options.some((o) => !o.trim()))) {
      setCreateError('Every quiz question needs text and all options filled in');
      return;
    }

    setCreating(true);
    try {
      const created = await createModule({
        title: title.trim(),
        version: version.trim() || '2026.1',
        slaDays,
        lessons,
        quizQuestions,
        assignAll,
        employeeIds: assignAll ? undefined : selectedEmployeeIds,
      });
      setCreateSuccess(`"${created.title}" created and assigned.`);
      setTitle('');
      setVersion('2026.1');
      setSlaDays(7);
      setLessons([{ ...EMPTY_LESSON }]);
      setQuizQuestions([
        { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] },
        { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] },
        { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] },
      ]);
      setAssignAll(true);
      setSelectedEmployeeIds([]);
      loadModules();
    } catch (err) {
      setCreateError((err as ApiClientError).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleAssignToTeam(moduleId: string) {
    setAssigningModuleId(moduleId);
    setAssignedModuleId(null);
    try {
      await assignModuleToAll(moduleId);
      setAssignedModuleId(moduleId);
      loadModules();
    } catch {
      // Non-fatal quick action; the module list's assignedCount not changing is signal enough.
    } finally {
      setAssigningModuleId(null);
    }
  }

  function handleViewCompletions(moduleId: string) {
    setViewingModuleId(moduleId);
    setLoadingCompletions(true);
    fetchModuleCompletions(moduleId)
      .then(setCompletions)
      .catch(() => setCompletions([]))
      .finally(() => setLoadingCompletions(false));
  }

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="h1">Module Management</h1>
        <p className="mt-1 text-sm text-brand-muted">Create training modules for your LOB and track completion rates.</p>

        <section className="mt-8">
          <h2 className="h3">Modules</h2>
          {listError && (
            <div className="mt-3">
              <ErrorBanner message={listError} />
            </div>
          )}
          {loadingModules ? (
            <div className="mt-6 flex justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : modules.length === 0 ? (
            <p className="mt-3 text-sm text-brand-muted">No modules created yet — use the form below.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {modules.map((m) => (
                <li key={m.id} className="card flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{m.title}</h3>
                      <span className="mono rounded-full bg-brand-surface px-2 py-0.5 text-xs">v{m.version}</span>
                    </div>
                    <p className="mt-1 text-xs text-brand-faint">
                      SLA {m.slaDays}d · {m.completedCount}/{m.assignedCount} completed ·{' '}
                      <span className="font-mono text-brand-green">{m.completionRate}%</span>
                    </p>
                    {assignedModuleId === m.id && <p className="mt-1 text-xs font-medium text-brand-green">Assigned to team.</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleAssignToTeam(m.id)}
                      disabled={assigningModuleId === m.id}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      {assigningModuleId === m.id && <Spinner className="h-3.5 w-3.5 text-brand-pink" />}
                      Assign to Team
                    </button>
                    <button type="button" onClick={() => handleViewCompletions(m.id)} className="btn-secondary px-3 py-1.5 text-xs">
                      View completions
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {viewingModuleId && (
            <div className="table-wrap mt-4">
              {loadingCompletions ? (
                <div className="flex justify-center p-6">
                  <Spinner className="h-5 w-5" />
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="table-head">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completions.map((c) => (
                      <tr key={c.employeeId} className="table-row">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{c.name}</div>
                          <div className="text-xs text-brand-faint">{c.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              c.overdue
                                ? 'badge-overdue'
                                : c.status === 'completed'
                                  ? 'badge-completed'
                                  : c.status === 'in_progress'
                                    ? 'badge-in-progress'
                                    : 'badge-not-started'
                            }
                          >
                            {c.overdue ? 'Overdue' : c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-brand-muted">{c.score ?? '—'}</td>
                        <td className="px-4 py-3 text-brand-muted">{new Date(c.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="h3">Create a module</h2>
          <form onSubmit={handleCreate} className="card mt-3 space-y-5">
            {createError && <ErrorBanner message={createError} />}
            {createSuccess && <p className="text-sm font-medium text-brand-green">{createSuccess}</p>}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="title">
                  Title
                </label>
                <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label" htmlFor="version">
                  Version
                </label>
                <input id="version" className="input-field font-mono" value={version} onChange={(e) => setVersion(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="slaDays">
                SLA (days)
              </label>
              <input
                id="slaDays"
                type="number"
                min={1}
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                className="input-field w-32"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-brand-muted">Lessons</h3>
                <button type="button" onClick={() => setLessons((prev) => [...prev, { ...EMPTY_LESSON }])} className="btn-secondary px-2.5 py-1 text-xs">
                  + Add lesson
                </button>
              </div>
              <div className="mt-2 space-y-3">
                {lessons.map((lesson, i) => (
                  <div key={i} className="session-card">
                    <div className="flex items-start gap-2">
                      <input
                        placeholder={`Lesson ${i + 1} title`}
                        value={lesson.title}
                        onChange={(e) => updateLesson(i, { title: e.target.value })}
                        className="input-field flex-1"
                      />
                      <select
                        value={lesson.contentType}
                        onChange={(e) => updateLesson(i, { contentType: e.target.value as 'text' | 'url' })}
                        className="input-field w-28"
                      >
                        <option value="text">Text</option>
                        <option value="url">URL</option>
                      </select>
                      {lessons.length > 1 && (
                        <button type="button" onClick={() => setLessons((prev) => prev.filter((_, idx) => idx !== i))} className="btn-danger px-2.5 py-1.5 text-xs">
                          Remove
                        </button>
                      )}
                    </div>
                    {lesson.contentType === 'text' ? (
                      <textarea
                        placeholder="Lesson content"
                        rows={3}
                        value={lesson.contentBody}
                        onChange={(e) => updateLesson(i, { contentBody: e.target.value })}
                        className="input-field mt-2"
                      />
                    ) : (
                      <input
                        placeholder="https://..."
                        value={lesson.contentUrl}
                        onChange={(e) => updateLesson(i, { contentUrl: e.target.value })}
                        className="input-field mt-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-brand-muted">Quiz (3–5 questions)</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={quizQuestions.length >= 5}
                    onClick={() => setQuizQuestions((prev) => [...prev, { ...EMPTY_QUESTION, options: [...EMPTY_QUESTION.options] }])}
                    className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
                  >
                    + Add question
                  </button>
                  <button
                    type="button"
                    disabled={quizQuestions.length <= 3}
                    onClick={() => setQuizQuestions((prev) => prev.slice(0, -1))}
                    className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
                  >
                    − Remove last
                  </button>
                </div>
              </div>
              <div className="mt-2 space-y-3">
                {quizQuestions.map((q, qi) => (
                  <div key={qi} className="session-card">
                    <input
                      placeholder={`Question ${qi + 1}`}
                      value={q.questionText}
                      onChange={(e) => updateQuestion(qi, { questionText: e.target.value })}
                      className="input-field"
                    />
                    <div className="mt-2 space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={q.correctIndex === oi}
                            onChange={() => updateQuestion(qi, { correctIndex: oi })}
                            className="h-4 w-4 accent-brand-green"
                          />
                          <input
                            placeholder={`Option ${oi + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(qi, oi, e.target.value)}
                            className="input-field flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-brand-faint">Select the radio button next to the correct answer.</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-brand-muted">
                <input type="checkbox" checked={assignAll} onChange={(e) => setAssignAll(e.target.checked)} className="h-4 w-4 accent-brand-green" />
                Assign to all new joinees in my LOB
              </label>
              {!assignAll && (
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-brand-border p-2">
                  {joinees.length === 0 && <p className="text-xs text-brand-faint">No new joinees in your LOB.</p>}
                  {joinees.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm text-brand-muted">
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(m.id)}
                        onChange={(e) =>
                          setSelectedEmployeeIds((prev) => (e.target.checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)))
                        }
                        className="h-4 w-4 accent-brand-green"
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={creating} className="btn-primary">
              {creating && <Spinner className="h-4 w-4 text-brand-black" />}
              {creating ? 'Creating…' : 'Create module'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
