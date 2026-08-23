import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { User } from '../models/User';
import { Module } from '../models/Module';
import { ModuleAssignment } from '../models/ModuleAssignment';
import { CompletionRecord } from '../models/CompletionRecord';
import { MentorAssignment } from '../models/MentorAssignment';
import { CourseProgress } from '../models/CourseProgress';
import { Reminder, REMINDER_TARGET_TYPES } from '../models/Reminder';
import type { ReminderTargetType } from '../models/Reminder';
import { COLLABORATION_SESSIONS } from '../constants/collaborationSessions';
import { computeCollaborationStatus, fullName } from '../services/collaborationStatusService';
import { HttpError } from '../middleware/errorHandler';

const userRepo = () => AppDataSource.getRepository(User);
const moduleRepo = () => AppDataSource.getRepository(Module);
const moduleAssignmentRepo = () => AppDataSource.getRepository(ModuleAssignment);
const completionRepo = () => AppDataSource.getRepository(CompletionRecord);
const mentorAssignmentRepo = () => AppDataSource.getRepository(MentorAssignment);
const progressRepo = () => AppDataSource.getRepository(CourseProgress);
const reminderRepo = () => AppDataSource.getRepository(Reminder);

function startOfThisWeekUTC(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + diffToMonday);
  return monday;
}

async function requireLeaderLob(req: Request): Promise<User> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) throw new HttpError(400, 'Your account has no line of business set');
  return leader;
}

async function loadLobEmployeeIds(lobId: string): Promise<string[]> {
  const employees = await userRepo().find({ where: { lobId, role: 'new_joinee' } });
  return employees.map((e) => e.id);
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  const leader = await requireLeaderLob(req);
  const lobId = leader.lobId as string;
  const employeeIds = await loadLobEmployeeIds(lobId);
  const weekStart = startOfThisWeekUTC();
  const now = new Date();

  if (employeeIds.length === 0) {
    res.json({ totalNewJoinees: 0, modulesCompletedThisWeek: 0, overdueModules: 0, mentorAssignmentsActive: 0, sessionsCompletedThisWeek: 0 });
    return;
  }

  const [moduleAssignments, completions, mentorAssignments] = await Promise.all([
    moduleAssignmentRepo()
      .createQueryBuilder('a')
      .where('a.employee_id IN (:...ids)', { ids: employeeIds })
      .getMany(),
    completionRepo()
      .createQueryBuilder('c')
      .where('c.employee_id IN (:...ids)', { ids: employeeIds })
      .getMany(),
    mentorAssignmentRepo()
      .createQueryBuilder('a')
      .innerJoin('a.mentee', 'mentee')
      .where('mentee.lob_id = :lobId', { lobId })
      .andWhere('a.status = :status', { status: 'active' })
      .getMany(),
  ]);

  const completedPairs = new Set(completions.map((c) => `${c.employeeId}:${c.moduleId}`));
  const overdueModules = moduleAssignments.filter((a) => !completedPairs.has(`${a.employeeId}:${a.moduleId}`) && a.dueDate < now).length;
  const modulesCompletedThisWeek = completions.filter((c) => c.completedAt >= weekStart).length;

  let sessionsCompletedThisWeek = 0;
  if (mentorAssignments.length > 0) {
    const sessions = await progressRepo()
      .createQueryBuilder('s')
      .where('s.assignment_id IN (:...ids)', { ids: mentorAssignments.map((a) => a.id) })
      .andWhere('s.completed_at IS NOT NULL')
      .getMany();
    sessionsCompletedThisWeek = sessions.filter((s) => s.completedAt && s.completedAt >= weekStart).length;
  }

  res.json({
    totalNewJoinees: employeeIds.length,
    modulesCompletedThisWeek,
    overdueModules,
    mentorAssignmentsActive: mentorAssignments.length,
    sessionsCompletedThisWeek,
  });
}

type CompletionStatus = 'completed' | 'overdue' | 'in_progress' | 'not_started';

async function buildCompletionRows(lobId: string) {
  const employeeIds = await loadLobEmployeeIds(lobId);
  if (employeeIds.length === 0) return [];

  const [assignments, completions] = await Promise.all([
    moduleAssignmentRepo()
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.employee', 'employee')
      .innerJoinAndSelect('a.module', 'module')
      .where('a.employee_id IN (:...ids)', { ids: employeeIds })
      .getMany(),
    completionRepo().createQueryBuilder('c').where('c.employee_id IN (:...ids)', { ids: employeeIds }).getMany(),
  ]);

  const latestByPair = new Map<string, CompletionRecord>();
  for (const c of completions) {
    const key = `${c.employeeId}:${c.moduleId}`;
    const existing = latestByPair.get(key);
    if (!existing || c.completedAt > existing.completedAt) latestByPair.set(key, c);
  }

  const now = new Date();
  return assignments
    .filter((a) => a.employee && a.module)
    .map((a) => {
      const completion = latestByPair.get(`${a.employeeId}:${a.moduleId}`);
      let status: CompletionStatus;
      if (completion) status = 'completed';
      else if (now > a.dueDate) status = 'overdue';
      else if (a.startedAt) status = 'in_progress';
      else status = 'not_started';

      return {
        moduleAssignmentId: a.id,
        employeeName: fullName(a.employee!),
        moduleName: a.module!.title,
        moduleVersion: a.module!.version,
        assignedDate: a.assignedDate,
        dueDate: a.dueDate,
        completionDate: completion?.completedAt ?? null,
        score: completion?.score ?? null,
        status,
      };
    });
}

export async function getCompletions(req: Request, res: Response): Promise<void> {
  const leader = await requireLeaderLob(req);
  res.json({ rows: await buildCompletionRows(leader.lobId as string) });
}

export async function getMentorTable(req: Request, res: Response): Promise<void> {
  const leader = await requireLeaderLob(req);

  const assignments = await mentorAssignmentRepo()
    .createQueryBuilder('a')
    .innerJoinAndSelect('a.mentor', 'mentor')
    .innerJoinAndSelect('a.mentee', 'mentee')
    .where('mentee.lob_id = :lobId', { lobId: leader.lobId })
    .orderBy('a.assigned_date', 'DESC')
    .getMany();

  const now = new Date();
  const rows = await Promise.all(
    assignments.map(async (a) => {
      const sessions = await progressRepo().find({ where: { assignmentId: a.id } });
      const { status, completedCount, lastActivityAt } = computeCollaborationStatus(sessions, a.assignedDate);
      const anchor = lastActivityAt ?? a.assignedDate;
      const daysSinceLastSession = Math.floor((now.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));

      return {
        assignmentId: a.id,
        menteeName: fullName(a.mentee!),
        mentorName: fullName(a.mentor!),
        assignedDate: a.assignedDate,
        sessionsCompleted: completedCount,
        totalSessions: COLLABORATION_SESSIONS.length,
        daysSinceLastSession,
        status,
      };
    }),
  );

  res.json({ rows });
}

export async function getOverdue(req: Request, res: Response): Promise<void> {
  const leader = await requireLeaderLob(req);
  const lobId = leader.lobId as string;
  const now = new Date();

  const completionRows = await buildCompletionRows(lobId);
  const overdueModuleItems = completionRows
    .filter((r) => r.status === 'overdue')
    .map((r) => ({
      targetType: 'module_assignment' as ReminderTargetType,
      targetId: r.moduleAssignmentId,
      employeeName: r.employeeName,
      what: r.moduleName,
      daysOverdue: Math.floor((now.getTime() - new Date(r.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
    }));

  const mentorAssignments = await mentorAssignmentRepo()
    .createQueryBuilder('a')
    .innerJoinAndSelect('a.mentee', 'mentee')
    .where('mentee.lob_id = :lobId', { lobId })
    .getMany();

  const overdueSessionItems: { targetType: ReminderTargetType; targetId: string; employeeName: string; what: string; daysOverdue: number }[] = [];
  for (const a of mentorAssignments) {
    const sessions = await progressRepo().find({ where: { assignmentId: a.id }, order: { sessionNumber: 'ASC' } });
    const { status, nextDueDate } = computeCollaborationStatus(sessions, a.assignedDate);
    if (status !== 'overdue' || !nextDueDate) continue;
    const nextSession = sessions.find((s) => !s.completedAt);
    if (!nextSession) continue;
    overdueSessionItems.push({
      targetType: 'course_progress',
      targetId: nextSession.id,
      employeeName: fullName(a.mentee!),
      what: `Collaboration session ${nextSession.sessionNumber}: ${COLLABORATION_SESSIONS[nextSession.sessionNumber - 1]?.title ?? ''}`,
      daysOverdue: Math.floor((now.getTime() - nextDueDate.getTime()) / (1000 * 60 * 60 * 24)),
    });
  }

  const allItems = [...overdueModuleItems, ...overdueSessionItems].sort((a, b) => b.daysOverdue - a.daysOverdue);

  const reminders =
    allItems.length > 0
      ? await reminderRepo()
          .createQueryBuilder('r')
          .where(
            allItems.map((_, i) => `(r.target_type = :type${i} AND r.target_id = :id${i})`).join(' OR '),
            Object.fromEntries(allItems.flatMap((item, i) => [[`type${i}`, item.targetType], [`id${i}`, item.targetId]])),
          )
          .getMany()
      : [];
  const reminderByKey = new Map(reminders.map((r) => [`${r.targetType}:${r.targetId}`, r.sentAt]));

  res.json({
    items: allItems.map((item) => ({
      ...item,
      reminderSent: reminderByKey.has(`${item.targetType}:${item.targetId}`),
      reminderSentAt: reminderByKey.get(`${item.targetType}:${item.targetId}`) ?? null,
    })),
  });
}

export async function sendReminder(req: Request, res: Response): Promise<void> {
  const leader = await requireLeaderLob(req);
  const targetType = req.params.targetType as ReminderTargetType;
  const { targetId } = req.params;

  if (!(REMINDER_TARGET_TYPES as readonly string[]).includes(targetType)) {
    throw new HttpError(400, `targetType must be one of: ${REMINDER_TARGET_TYPES.join(', ')}`);
  }

  if (targetType === 'module_assignment') {
    const assignment = await moduleAssignmentRepo().findOne({ where: { id: targetId }, relations: { employee: true } });
    if (!assignment || assignment.employee?.lobId !== leader.lobId) throw new HttpError(404, 'Module assignment not found');
  } else {
    const session = await progressRepo().findOne({ where: { id: targetId }, relations: { assignment: { mentee: true } } });
    if (!session || session.assignment?.mentee?.lobId !== leader.lobId) throw new HttpError(404, 'Collaboration session not found');
  }

  const existing = await reminderRepo().findOne({ where: { targetType, targetId } });
  if (existing) {
    res.json({ reminderSent: true, reminderSentAt: existing.sentAt });
    return;
  }

  const reminder = reminderRepo().create({ targetType, targetId, sentBy: req.userId as string });
  await reminderRepo().save(reminder);
  res.status(201).json({ reminderSent: true, reminderSentAt: reminder.sentAt });
}

function csvEscape(value: string | number | null): string {
  const str = value === null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function exportCsv(req: Request, res: Response): Promise<void> {
  const leader = await requireLeaderLob(req);
  const rows = (await buildCompletionRows(leader.lobId as string)).filter((r) => r.status === 'completed');

  const header = ['Employee', 'Module', 'Version', 'Completion Date', 'Score'];
  const lines = [
    header.join(','),
    ...rows.map((r) => [r.employeeName, r.moduleName, r.moduleVersion, (r.completionDate as Date).toISOString(), r.score ?? ''].map(csvEscape).join(',')),
  ];

  const dateStamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="cue_completion_report_${dateStamp}.csv"`);
  res.send(lines.join('\n'));
}

export async function getModules(req: Request, res: Response): Promise<void> {
  const leader = await requireLeaderLob(req);
  const modules = await moduleRepo().find({ where: { lobId: leader.lobId as string, isArchived: false }, order: { orderIndex: 'ASC' } });
  res.json({ modules: modules.map((m) => ({ id: m.id, title: m.title, version: m.version })) });
}
