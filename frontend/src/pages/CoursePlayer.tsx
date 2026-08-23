import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { fetchModuleDetail, submitModuleCompletion } from '../api/modulesApi';
import CourseAskAI from '../components/chat/CourseAskAI';
import type { ApiClientError } from '../api/httpClient';
import type { ModuleDetail } from '../types';

type Phase = 'lessons' | 'quiz' | 'result';

export default function CoursePlayer() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ModuleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('lessons');
  const [lessonIndex, setLessonIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showAskAI, setShowAskAI] = useState(false);

  useEffect(() => {
    if (!moduleId) return;
    fetchModuleDetail(moduleId)
      .then((data) => {
        setDetail(data);
        setAnswers(new Array(data.quizQuestions.length).fill(-1));
      })
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }, [moduleId]);

  async function handleSubmitQuiz() {
    if (!moduleId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitModuleCompletion(moduleId, answers);
      setScore(result.score);
      setPhase('result');
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteWithoutQuiz() {
    if (!moduleId) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitModuleCompletion(moduleId, []);
      setScore(result.score);
      setPhase('result');
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-bg min-h-screen">
        <Nav />
        <div className="flex justify-center py-20">
          <Spinner className="h-6 w-6" />
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="page-bg min-h-screen">
        <Nav />
        <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <ErrorBanner message={error} />
          <Link to="/training" className="btn-secondary mt-4 inline-flex">
            Back to modules
          </Link>
        </main>
      </div>
    );
  }

  if (!detail) return null;

  const { module, lessons, quizQuestions } = detail;
  const lesson = lessons[lessonIndex];
  const isLastLesson = lessonIndex === lessons.length - 1;

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="mono text-xs uppercase tracking-widest">Version {module.version}</p>
        <h1 className="h1 mt-1 text-3xl">{module.title}</h1>
        {module.lobName && <p className="mt-1 text-sm text-brand-muted">{module.lobName}</p>}

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {phase === 'lessons' && lessons.length === 0 && (
          <div className="card mt-6">
            <p className="text-sm text-brand-muted">This module has no lesson content yet.</p>
            <button type="button" onClick={() => void handleCompleteWithoutQuiz()} disabled={submitting} className="btn-primary mt-4">
              {submitting && <Spinner className="h-4 w-4 text-brand-black" />}
              Complete Module
            </button>
          </div>
        )}

        {phase === 'lessons' && lesson && (
          <div className="card mt-6">
            <p className="text-xs font-medium text-brand-green">
              Lesson {lessonIndex + 1} of {lessons.length}
            </p>
            <h2 className="h3 mt-1">{lesson.title}</h2>

            <div className="mt-4">
              {lesson.contentType === 'text' && lesson.contentBody && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-muted">{lesson.contentBody}</p>
              )}
              {lesson.contentType === 'url' && lesson.contentUrl && (
                <div className="space-y-2">
                  <a
                    href={lesson.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm text-brand-green hover:text-brand-pink hover:underline"
                  >
                    Open resource ↗
                  </a>
                  <div className="overflow-hidden rounded-lg border border-brand-border">
                    <iframe src={lesson.contentUrl} title={lesson.title} className="h-64 w-full bg-brand-surface" />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                disabled={lessonIndex === 0}
                onClick={() => setLessonIndex((i) => Math.max(0, i - 1))}
                className="btn-secondary px-4 py-1.5 text-xs"
              >
                Previous
              </button>

              {isLastLesson ? (
                quizQuestions.length > 0 ? (
                  <button type="button" onClick={() => setPhase('quiz')} className="btn-primary px-4 py-1.5 text-xs">
                    Start quiz
                  </button>
                ) : (
                  <button type="button" onClick={() => void handleCompleteWithoutQuiz()} disabled={submitting} className="btn-primary px-4 py-1.5 text-xs">
                    {submitting && <Spinner className="h-3.5 w-3.5 text-brand-black" />}
                    Complete Module
                  </button>
                )
              ) : (
                <button type="button" onClick={() => setLessonIndex((i) => Math.min(lessons.length - 1, i + 1))} className="btn-primary px-4 py-1.5 text-xs">
                  Next
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'quiz' && quizQuestions[questionIndex] && (
          <div className="card mt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-brand-pink">
                  Question {questionIndex + 1} of {quizQuestions.length}
                </p>
                <h2 className="h3 mt-1 text-base">{quizQuestions[questionIndex].questionText}</h2>
              </div>
              <button type="button" onClick={() => setShowAskAI(true)} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                Ask Knowledge Buddy
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {quizQuestions[questionIndex].options.map((opt, i) => {
                const selected = answers[questionIndex] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswers((prev) => prev.map((a, idx) => (idx === questionIndex ? i : a)))}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                      selected ? 'border-brand-green bg-brand-green/10 text-white' : 'border-brand-border bg-brand-dark text-brand-muted hover:border-brand-pink'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => (questionIndex === 0 ? setPhase('lessons') : setQuestionIndex((i) => i - 1))}
                className="btn-secondary px-4 py-1.5 text-xs"
              >
                Previous
              </button>

              {questionIndex === quizQuestions.length - 1 ? (
                <button
                  type="button"
                  disabled={answers[questionIndex] === -1 || submitting}
                  onClick={() => void handleSubmitQuiz()}
                  className="btn-primary px-4 py-1.5 text-xs"
                >
                  {submitting && <Spinner className="h-3.5 w-3.5 text-brand-black" />}
                  Submit Quiz
                </button>
              ) : (
                <button
                  type="button"
                  disabled={answers[questionIndex] === -1}
                  onClick={() => setQuestionIndex((i) => i + 1)}
                  className="btn-primary px-4 py-1.5 text-xs"
                >
                  Next Question
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="card-active mt-6 text-center">
            <h2 className="h2">Module Complete!</h2>
            <p className="mt-2 text-sm text-brand-muted">{score !== null ? `Score: ${score}%` : 'Marked complete.'}</p>
            <button type="button" onClick={() => navigate('/training')} className="btn-primary mt-6">
              Back to modules
            </button>
          </div>
        )}
      </main>

      {showAskAI && quizQuestions[questionIndex] && moduleId && (
        <CourseAskAI
          moduleId={moduleId}
          quizQuestionId={quizQuestions[questionIndex].id}
          questionText={quizQuestions[questionIndex].questionText}
          onClose={() => setShowAskAI(false)}
        />
      )}
    </div>
  );
}
