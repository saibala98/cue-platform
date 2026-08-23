import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../database/data-source';
import { Module } from '../models/Module';
import { ModuleLesson, LESSON_CONTENT_TYPES } from '../models/ModuleLesson';
import { ModuleQuizQuestion } from '../models/ModuleQuizQuestion';
import { ModuleAssignment } from '../models/ModuleAssignment';
import { CompletionRecord } from '../models/CompletionRecord';
import { User } from '../models/User';
import { assignModuleToAllInLob, assignModuleToEmployees } from '../services/moduleAssignmentService';
import { HttpError } from '../middleware/errorHandler';

const moduleRepo = () => AppDataSource.getRepository(Module);
const lessonRepo = () => AppDataSource.getRepository(ModuleLesson);
const quizRepo = () => AppDataSource.getRepository(ModuleQuizQuestion);
const assignmentRepo = () => AppDataSource.getRepository(ModuleAssignment);
const completionRepo = () => AppDataSource.getRepository(CompletionRecord);
const userRepo = () => AppDataSource.getRepository(User);

interface LessonInput {
  title: string;
  contentType: 'text' | 'url';
  contentBody?: string;
  contentUrl?: string;
}

interface QuizInput {
  questionText: string;
  options: string[];
  correctIndex: number;
}

function validateLessons(input: unknown): LessonInput[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new HttpError(400, 'lessons must be a non-empty array');
  }
  return input.map((raw, i) => {
    const l = raw as Partial<LessonInput>;
    if (typeof l.title !== 'string' || !l.title.trim()) throw new HttpError(400, `lessons[${i}].title is required`);
    if (!LESSON_CONTENT_TYPES.includes(l.contentType as 'text' | 'url')) {
      throw new HttpError(400, `lessons[${i}].contentType must be "text" or "url"`);
    }
    if (l.contentType === 'text' && (typeof l.contentBody !== 'string' || !l.contentBody.trim())) {
      throw new HttpError(400, `lessons[${i}].contentBody is required for text lessons`);
    }
    if (l.contentType === 'url' && (typeof l.contentUrl !== 'string' || !l.contentUrl.trim())) {
      throw new HttpError(400, `lessons[${i}].contentUrl is required for url lessons`);
    }
    return {
      title: l.title.trim(),
      contentType: l.contentType as 'text' | 'url',
      contentBody: l.contentBody?.trim(),
      contentUrl: l.contentUrl?.trim(),
    };
  });
}

function validateQuiz(input: unknown): QuizInput[] {
  if (!Array.isArray(input) || input.length < 3 || input.length > 5) {
    throw new HttpError(400, 'quizQuestions must be an array of 3 to 5 questions');
  }
  return input.map((raw, i) => {
    const q = raw as Partial<QuizInput>;
    if (typeof q.questionText !== 'string' || !q.questionText.trim()) {
      throw new HttpError(400, `quizQuestions[${i}].questionText is required`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 || q.options.some((o) => typeof o !== 'string' || !o.trim())) {
      throw new HttpError(400, `quizQuestions[${i}].options must be 2-6 non-empty strings`);
    }
    if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      throw new HttpError(400, `quizQuestions[${i}].correctIndex must index into options`);
    }
    return { questionText: q.questionText.trim(), options: q.options.map((o) => o.trim()), correctIndex: q.correctIndex };
  });
}

export async function listAdminModules(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) {
    res.json({ modules: [] });
    return;
  }

  const modules = await moduleRepo().find({ where: { lobId: leader.lobId, isArchived: false }, order: { orderIndex: 'ASC' } });

  const summaries = await Promise.all(
    modules.map(async (m) => {
      const [assignedCount, completions] = await Promise.all([
        assignmentRepo().count({ where: { moduleId: m.id } }),
        completionRepo().find({ where: { moduleId: m.id } }),
      ]);
      const completedEmployeeIds = new Set(completions.map((c) => c.employeeId));
      return {
        id: m.id,
        title: m.title,
        version: m.version,
        slaDays: m.slaDays,
        assignedCount,
        completedCount: completedEmployeeIds.size,
        completionRate: assignedCount === 0 ? 0 : Math.round((completedEmployeeIds.size / assignedCount) * 100),
      };
    }),
  );

  res.json({ modules: summaries });
}

export async function createModule(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) throw new HttpError(400, 'Your account has no line of business set');

  const { title, version, slaDays, lessons, quizQuestions, employeeIds } = req.body ?? {};
  const assignAll = req.body?.assignAll !== false; // default true unless explicitly false

  if (typeof title !== 'string' || !title.trim()) throw new HttpError(400, 'title is required');
  const resolvedVersion = typeof version === 'string' && version.trim() ? version.trim() : '2026.1';
  const resolvedSlaDays = slaDays === undefined || slaDays === null ? 7 : Number(slaDays);
  if (!Number.isInteger(resolvedSlaDays) || resolvedSlaDays < 1) throw new HttpError(400, 'slaDays must be a positive integer');

  const lessonInputs = validateLessons(lessons);
  const quizInputs = validateQuiz(quizQuestions);

  if (!assignAll && employeeIds !== undefined) {
    if (!Array.isArray(employeeIds) || employeeIds.some((id) => typeof id !== 'string')) {
      throw new HttpError(400, 'employeeIds must be an array of strings');
    }
  }

  const module = await AppDataSource.transaction(async (manager) => {
    const newId = randomUUID();
    const created = manager.getRepository(Module).create({
      id: newId,
      title: title.trim(),
      lobId: leader.lobId,
      contentType: 'course',
      version: resolvedVersion,
      orderIndex: (await manager.getRepository(Module).count({ where: { lobId: leader.lobId as string } })) + 1,
      slaDays: resolvedSlaDays,
      familyId: newId, // a freshly created module is the root of its own version family
    });
    await manager.getRepository(Module).save(created);

    await manager.getRepository(ModuleLesson).save(
      lessonInputs.map((l, i) =>
        manager.getRepository(ModuleLesson).create({
          moduleId: created.id,
          title: l.title,
          orderIndex: i + 1,
          contentType: l.contentType,
          contentBody: l.contentType === 'text' ? (l.contentBody ?? null) : null,
          contentUrl: l.contentType === 'url' ? (l.contentUrl ?? null) : null,
        }),
      ),
    );

    await manager.getRepository(ModuleQuizQuestion).save(
      quizInputs.map((q, i) =>
        manager.getRepository(ModuleQuizQuestion).create({
          moduleId: created.id,
          questionText: q.questionText,
          orderIndex: i + 1,
          options: q.options,
          correctIndex: q.correctIndex,
        }),
      ),
    );

    return created;
  });

  if (assignAll) {
    await assignModuleToAllInLob(module.id, leader.lobId, resolvedSlaDays);
  } else if (Array.isArray(employeeIds) && employeeIds.length > 0) {
    const validEmployees = await userRepo().find({ where: { lobId: leader.lobId, role: 'new_joinee' } });
    const validIds = new Set(validEmployees.map((e) => e.id));
    const filtered = employeeIds.filter((id: string) => validIds.has(id));
    await assignModuleToEmployees(module.id, filtered, resolvedSlaDays);
  }

  res.status(201).json({ module: { id: module.id, title: module.title, version: module.version, slaDays: module.slaDays } });
}

export async function assignModule(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  const module = await moduleRepo().findOneBy({ id: req.params.id });
  if (!module || module.lobId !== leader?.lobId) throw new HttpError(404, 'Module not found');

  const { employeeIds } = req.body ?? {};
  const assignAll = req.body?.assignAll === true;

  if (assignAll) {
    await assignModuleToAllInLob(module.id, module.lobId as string, module.slaDays);
  } else {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0 || employeeIds.some((id) => typeof id !== 'string')) {
      throw new HttpError(400, 'Provide employeeIds (non-empty array) or assignAll: true');
    }
    const validEmployees = await userRepo().find({ where: { lobId: module.lobId as string, role: 'new_joinee' } });
    const validIds = new Set(validEmployees.map((e) => e.id));
    const filtered = employeeIds.filter((id: string) => validIds.has(id));
    if (filtered.length === 0) throw new HttpError(400, 'None of the given employeeIds are new joinees in this module’s LOB');
    await assignModuleToEmployees(module.id, filtered, module.slaDays);
  }

  res.status(200).json({ ok: true });
}

export async function getModuleCompletions(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  const module = await moduleRepo().findOneBy({ id: req.params.id });
  if (!module || module.lobId !== leader?.lobId) throw new HttpError(404, 'Module not found');

  const assignments = await assignmentRepo().find({ where: { moduleId: module.id }, relations: { employee: true } });
  const completions = await completionRepo().find({ where: { moduleId: module.id }, order: { completedAt: 'DESC' } });
  const latestByEmployee = new Map<string, CompletionRecord>();
  for (const c of completions) {
    if (!latestByEmployee.has(c.employeeId)) latestByEmployee.set(c.employeeId, c);
  }

  const now = new Date();
  res.json({
    employees: assignments
      .filter((a) => a.employee)
      .map((a) => {
        const completion = latestByEmployee.get(a.employeeId);
        const status = completion ? 'completed' : a.startedAt ? 'in_progress' : 'not_started';
        return {
          employeeId: a.employeeId,
          name: `${a.employee!.firstName} ${a.employee!.lastName}`,
          email: a.employee!.email,
          status,
          score: completion?.score ?? null,
          completedAt: completion?.completedAt ?? null,
          dueDate: a.dueDate,
          overdue: status !== 'completed' && now > a.dueDate,
        };
      }),
  });
}
