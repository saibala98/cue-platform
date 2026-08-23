import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { Module } from '../models/Module';
import { ModuleAssignment } from '../models/ModuleAssignment';
import { ModuleLesson } from '../models/ModuleLesson';
import { ModuleQuizQuestion } from '../models/ModuleQuizQuestion';
import { CompletionRecord } from '../models/CompletionRecord';
import { HttpError } from '../middleware/errorHandler';

const moduleRepo = () => AppDataSource.getRepository(Module);
const assignmentRepo = () => AppDataSource.getRepository(ModuleAssignment);
const lessonRepo = () => AppDataSource.getRepository(ModuleLesson);
const quizRepo = () => AppDataSource.getRepository(ModuleQuizQuestion);
const completionRepo = () => AppDataSource.getRepository(CompletionRecord);

type Status = 'not_started' | 'in_progress' | 'completed';

function deriveStatus(assignment: ModuleAssignment, completed: boolean): Status {
  if (completed) return 'completed';
  return assignment.startedAt ? 'in_progress' : 'not_started';
}

export async function listAssignedModules(req: Request, res: Response): Promise<void> {
  const assignments = await assignmentRepo().find({
    where: { employeeId: req.userId },
    relations: { module: { lob: true } },
    order: { dueDate: 'ASC' },
  });

  const moduleIds = assignments.map((a) => a.moduleId);
  const completions = moduleIds.length
    ? await completionRepo().find({ where: { employeeId: req.userId }, order: { completedAt: 'DESC' } })
    : [];
  const latestCompletionByModule = new Map<string, CompletionRecord>();
  for (const c of completions) {
    if (!latestCompletionByModule.has(c.moduleId)) latestCompletionByModule.set(c.moduleId, c);
  }

  const now = new Date();
  res.json({
    modules: assignments
      .filter((a) => a.module)
      .map((a) => {
        const completion = latestCompletionByModule.get(a.moduleId);
        const status = deriveStatus(a, Boolean(completion));
        return {
          assignmentId: a.id,
          moduleId: a.moduleId,
          title: a.module!.title,
          lobName: a.module!.lob?.name ?? null,
          version: a.module!.version,
          slaDays: a.module!.slaDays,
          assignedDate: a.assignedDate,
          dueDate: a.dueDate,
          status,
          score: completion?.score ?? null,
          completedAt: completion?.completedAt ?? null,
          overdue: status !== 'completed' && now > a.dueDate,
        };
      }),
  });
}

async function loadAssignmentIfAny(userId: string, moduleId: string): Promise<ModuleAssignment | null> {
  return assignmentRepo().findOne({ where: { employeeId: userId, moduleId } });
}

export async function getModuleDetail(req: Request, res: Response): Promise<void> {
  const module = await moduleRepo().findOne({ where: { id: req.params.id }, relations: { lob: true } });
  if (!module) throw new HttpError(404, 'Module not found');

  const assignment = await loadAssignmentIfAny(req.userId as string, module.id);
  const isOversight = req.userRole === 'people_leader' || req.userRole === 'compliance_admin';
  if (!assignment && !isOversight) {
    throw new HttpError(403, 'This module is not assigned to you');
  }

  if (assignment && !assignment.startedAt) {
    // A literal NOW() (not a client `new Date()`) — see data-source.ts for
    // why passing a JS Date as a parameter to a `timestamp` (no timezone)
    // column silently corrupts it via the pg driver's local-time serialization.
    await assignmentRepo().update({ id: assignment.id }, { startedAt: () => 'NOW()' });
    assignment.startedAt = (await assignmentRepo().findOneBy({ id: assignment.id }))!.startedAt;
  }

  const [lessons, quizQuestions] = await Promise.all([
    lessonRepo().find({ where: { moduleId: module.id }, order: { orderIndex: 'ASC' } }),
    quizRepo().find({ where: { moduleId: module.id }, order: { orderIndex: 'ASC' } }),
  ]);

  // Fall back to the module's own legacy content fields as a single lesson,
  // so modules created before the lesson model existed still play correctly.
  const effectiveLessons =
    lessons.length > 0
      ? lessons
      : module.contentBody || module.contentUrl
        ? [
            {
              id: `${module.id}-legacy`,
              title: module.title,
              orderIndex: 1,
              contentType: module.contentUrl ? ('url' as const) : ('text' as const),
              contentBody: module.contentBody,
              contentUrl: module.contentUrl,
            },
          ]
        : [];

  res.json({
    module: {
      id: module.id,
      title: module.title,
      lobName: module.lob?.name ?? null,
      version: module.version,
      slaDays: module.slaDays,
    },
    lessons: effectiveLessons.map((l) => ({
      id: l.id,
      title: l.title,
      orderIndex: l.orderIndex,
      contentType: l.contentType,
      contentBody: l.contentBody,
      contentUrl: l.contentUrl,
    })),
    // correctIndex intentionally omitted so the client can never read the answer key.
    quizQuestions: quizQuestions.map((q) => ({ id: q.id, questionText: q.questionText, orderIndex: q.orderIndex, options: q.options })),
    progress: assignment
      ? {
          status: deriveStatus(assignment, false),
          dueDate: assignment.dueDate,
          startedAt: assignment.startedAt,
        }
      : null,
  });
}

export async function getModuleProgress(req: Request, res: Response): Promise<void> {
  const assignment = await loadAssignmentIfAny(req.userId as string, req.params.id);
  if (!assignment) throw new HttpError(404, 'You are not assigned to this module');

  const completion = await completionRepo().findOne({
    where: { employeeId: req.userId, moduleId: req.params.id },
    order: { completedAt: 'DESC' },
  });
  const status = deriveStatus(assignment, Boolean(completion));

  res.json({
    status,
    score: completion?.score ?? null,
    completedAt: completion?.completedAt ?? null,
    dueDate: assignment.dueDate,
    overdue: status !== 'completed' && new Date() > assignment.dueDate,
  });
}

export async function submitCompletion(req: Request, res: Response): Promise<void> {
  const module = await moduleRepo().findOneBy({ id: req.params.id });
  if (!module) throw new HttpError(404, 'Module not found');

  const assignment = await loadAssignmentIfAny(req.userId as string, module.id);
  if (!assignment) throw new HttpError(403, 'This module is not assigned to you');

  const { answers } = req.body ?? {};
  const questions = await quizRepo().find({ where: { moduleId: module.id }, order: { orderIndex: 'ASC' } });

  let score: number | null = null;
  if (questions.length > 0) {
    if (!Array.isArray(answers) || answers.length !== questions.length || answers.some((a) => typeof a !== 'number')) {
      throw new HttpError(400, `answers must be an array of ${questions.length} option indexes`);
    }
    const correctCount = questions.reduce((count, q, i) => (answers[i] === q.correctIndex ? count + 1 : count), 0);
    score = Math.round((correctCount / questions.length) * 100);
  }

  const completion = completionRepo().create({
    employeeId: req.userId as string,
    moduleId: module.id,
    moduleVersion: module.version,
    score,
  });
  await completionRepo().save(completion);

  res.status(201).json({
    score,
    completion: { id: completion.id, moduleVersion: completion.moduleVersion, score: completion.score, completedAt: completion.completedAt },
  });
}
