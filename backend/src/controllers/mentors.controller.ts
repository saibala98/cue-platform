import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { User } from '../models/User';
import { MentorAssignment } from '../models/MentorAssignment';
import { CourseProgress } from '../models/CourseProgress';
import { CompletionRecord } from '../models/CompletionRecord';
import { ModuleAssignment } from '../models/ModuleAssignment';
import { COLLABORATION_SESSIONS } from '../constants/collaborationSessions';
import { computeCollaborationStatus, fullName as toName } from '../services/collaborationStatusService';
import { HttpError } from '../middleware/errorHandler';

const userRepo = () => AppDataSource.getRepository(User);
const assignmentRepo = () => AppDataSource.getRepository(MentorAssignment);
const progressRepo = () => AppDataSource.getRepository(CourseProgress);
const completionRepo = () => AppDataSource.getRepository(CompletionRecord);
const moduleAssignmentRepo = () => AppDataSource.getRepository(ModuleAssignment);
const computeStatus = computeCollaborationStatus;

async function loadOwnedAssignment(req: Request): Promise<MentorAssignment> {
  const assignment = await assignmentRepo().findOne({
    where: { id: req.params.assignmentId },
    relations: { mentor: true, mentee: true },
  });
  if (!assignment) throw new HttpError(404, 'Assignment not found');
  if (assignment.mentorId !== req.userId && assignment.menteeId !== req.userId) {
    throw new HttpError(403, 'You are not part of this mentor assignment');
  }
  return assignment;
}

export async function assignMentor(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) throw new HttpError(400, 'Your account has no line of business set');

  const { mentorId, menteeId } = req.body ?? {};
  if (typeof mentorId !== 'string' || typeof menteeId !== 'string') {
    throw new HttpError(400, 'mentorId and menteeId are required');
  }

  const [mentor, mentee] = await Promise.all([userRepo().findOneBy({ id: mentorId }), userRepo().findOneBy({ id: menteeId })]);
  if (!mentor || mentor.role !== 'mentor' || mentor.lobId !== leader.lobId) {
    throw new HttpError(400, 'mentorId must reference a mentor in your LOB');
  }
  if (!mentee || mentee.role !== 'new_joinee' || mentee.lobId !== leader.lobId) {
    throw new HttpError(400, 'menteeId must reference a new joinee in your LOB');
  }

  const existing = await assignmentRepo().findOne({ where: { menteeId: mentee.id, status: 'active' } });
  if (existing) throw new HttpError(409, `${toName(mentee)} already has an active mentor assignment`);

  const assignment = assignmentRepo().create({ leaderId: req.userId as string, mentorId: mentor.id, menteeId: mentee.id, status: 'active' });
  await assignmentRepo().save(assignment);

  await progressRepo().save(COLLABORATION_SESSIONS.map((s) => progressRepo().create({ assignmentId: assignment.id, sessionNumber: s.sessionNumber })));

  res.status(201).json({
    assignment: { id: assignment.id, mentorId: assignment.mentorId, menteeId: assignment.menteeId, assignedDate: assignment.assignedDate },
  });
}

export async function listUnassignedJoinees(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) {
    res.json({ joinees: [] });
    return;
  }

  const [joinees, activeAssignments] = await Promise.all([
    userRepo().find({ where: { lobId: leader.lobId, role: 'new_joinee' }, order: { lastName: 'ASC' } }),
    assignmentRepo().find({ where: { status: 'active' } }),
  ]);
  const assignedMenteeIds = new Set(activeAssignments.map((a) => a.menteeId));

  res.json({ joinees: joinees.filter((j) => !assignedMenteeIds.has(j.id)).map((j) => ({ id: j.id, name: toName(j) })) });
}

export async function listAvailableMentors(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) {
    res.json({ mentors: [] });
    return;
  }

  const [mentors, activeAssignments] = await Promise.all([
    userRepo().find({ where: { lobId: leader.lobId, role: 'mentor' }, order: { lastName: 'ASC' } }),
    assignmentRepo().find({ where: { status: 'active' } }),
  ]);
  const loadByMentor = new Map<string, number>();
  for (const a of activeAssignments) {
    loadByMentor.set(a.mentorId, (loadByMentor.get(a.mentorId) ?? 0) + 1);
  }

  res.json({ mentors: mentors.map((m) => ({ id: m.id, name: toName(m), menteeCount: loadByMentor.get(m.id) ?? 0 })) });
}

export async function listAssignmentsForLeader(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) {
    res.json({ assignments: [] });
    return;
  }

  const assignments = await assignmentRepo()
    .createQueryBuilder('a')
    .innerJoinAndSelect('a.mentor', 'mentor')
    .innerJoinAndSelect('a.mentee', 'mentee')
    .where('mentee.lob_id = :lobId', { lobId: leader.lobId })
    .orderBy('a.assigned_date', 'DESC')
    .getMany();

  const rows = await Promise.all(
    assignments.map(async (a) => {
      const sessions = await progressRepo().find({ where: { assignmentId: a.id } });
      const { status, completedCount } = computeStatus(sessions, a.assignedDate);
      return {
        id: a.id,
        menteeName: toName(a.mentee!),
        mentorName: toName(a.mentor!),
        assignedDate: a.assignedDate,
        sessionsCompleted: completedCount,
        totalSessions: COLLABORATION_SESSIONS.length,
        status,
      };
    }),
  );

  res.json({ assignments: rows });
}

export async function getMyAssignment(req: Request, res: Response): Promise<void> {
  const assignment = await assignmentRepo().findOne({
    where: { menteeId: req.userId, status: 'active' },
    relations: { mentor: true },
    order: { assignedDate: 'DESC' },
  });
  if (!assignment) {
    res.json({ assignment: null });
    return;
  }

  const sessions = await progressRepo().find({ where: { assignmentId: assignment.id } });
  const { status, completedCount, nextDueDate } = computeStatus(sessions, assignment.assignedDate);

  res.json({
    assignment: {
      id: assignment.id,
      assignedDate: assignment.assignedDate,
      mentor: assignment.mentor && { id: assignment.mentor.id, name: toName(assignment.mentor), role: assignment.mentor.role, email: assignment.mentor.email },
      sessionsCompleted: completedCount,
      totalSessions: COLLABORATION_SESSIONS.length,
      status,
      nextDueDate,
    },
  });
}

export async function getMyMentees(req: Request, res: Response): Promise<void> {
  const assignments = await assignmentRepo().find({
    where: { mentorId: req.userId, status: 'active' },
    relations: { mentee: true },
    order: { assignedDate: 'DESC' },
  });

  const rows = await Promise.all(
    assignments
      .filter((a) => a.mentee)
      .map(async (a) => {
        const sessions = await progressRepo().find({ where: { assignmentId: a.id } });
        const { status, completedCount } = computeStatus(sessions, a.assignedDate);

        const [moduleAssignments, completions] = await Promise.all([
          moduleAssignmentRepo().find({ where: { employeeId: a.menteeId } }),
          completionRepo().find({ where: { employeeId: a.menteeId } }),
        ]);
        const completedModuleIds = new Set(completions.map((c) => c.moduleId));

        return {
          assignmentId: a.id,
          menteeId: a.menteeId,
          menteeName: toName(a.mentee!),
          menteeEmail: a.mentee!.email,
          assignedDate: a.assignedDate,
          sessionsCompleted: completedCount,
          totalSessions: COLLABORATION_SESSIONS.length,
          status,
          modulesCompleted: completedModuleIds.size,
          modulesAssigned: moduleAssignments.length,
        };
      }),
  );

  res.json({ mentees: rows });
}

export async function getChecklist(req: Request, res: Response): Promise<void> {
  const assignment = await loadOwnedAssignment(req);
  const sessions = await progressRepo().find({ where: { assignmentId: assignment.id }, relations: { completedByUser: true } });
  const byNumber = new Map(sessions.map((s) => [s.sessionNumber, s]));
  const { status, completedCount, nextDueDate } = computeStatus(sessions, assignment.assignedDate);

  let dueDateAssigned = false;
  res.json({
    assignment: {
      id: assignment.id,
      mentorName: toName(assignment.mentor!),
      menteeName: toName(assignment.mentee!),
      assignedDate: assignment.assignedDate,
      status,
      sessionsCompleted: completedCount,
      totalSessions: COLLABORATION_SESSIONS.length,
    },
    sessions: COLLABORATION_SESSIONS.map((def) => {
      const row = byNumber.get(def.sessionNumber);
      // Only the next incomplete session in sequence carries a countdown —
      // sessions further out haven't started their 7-day clock yet.
      const dueDate = !row?.completedAt && !dueDateAssigned ? nextDueDate : null;
      if (dueDate) dueDateAssigned = true;
      return {
        sessionNumber: def.sessionNumber,
        title: def.title,
        description: def.description,
        completedAt: row?.completedAt ?? null,
        notes: row?.notes ?? null,
        completedByName: row?.completedByUser ? toName(row.completedByUser) : null,
        dueDate,
      };
    }),
  });
}

export async function getProgress(req: Request, res: Response): Promise<void> {
  const assignment = await loadOwnedAssignment(req);
  const sessions = await progressRepo().find({ where: { assignmentId: assignment.id } });
  const { status, completedCount, nextDueDate } = computeStatus(sessions, assignment.assignedDate);
  res.json({ completed: completedCount, total: COLLABORATION_SESSIONS.length, status, nextDueDate });
}

export async function completeSession(req: Request, res: Response): Promise<void> {
  const assignment = await loadOwnedAssignment(req);
  const sessionNumber = Number(req.params.sessionNumber);
  if (!Number.isInteger(sessionNumber) || sessionNumber < 1 || sessionNumber > COLLABORATION_SESSIONS.length) {
    throw new HttpError(400, `sessionNumber must be between 1 and ${COLLABORATION_SESSIONS.length}`);
  }

  const { notes } = req.body ?? {};
  if (notes !== undefined && typeof notes !== 'string') throw new HttpError(400, 'notes must be a string');

  const session = await progressRepo().findOne({ where: { assignmentId: assignment.id, sessionNumber } });
  if (!session) throw new HttpError(404, 'Session not found');
  if (session.completedAt) throw new HttpError(409, 'This session is already complete and cannot be unmarked');

  // A literal NOW() (not a client `new Date()`) — see data-source.ts for why
  // passing a JS Date as a parameter to a `timestamp` (no timezone) column
  // silently corrupts it via the pg driver's local-time serialization.
  await progressRepo().update({ id: session.id }, { completedAt: () => 'NOW()', completedBy: req.userId, notes: notes ?? null });
  const updated = (await progressRepo().findOneBy({ id: session.id }))!;

  const completedByUser = await userRepo().findOneBy({ id: req.userId });
  res.json({
    session: {
      sessionNumber: updated.sessionNumber,
      completedAt: updated.completedAt,
      notes: updated.notes,
      completedByName: completedByUser ? toName(completedByUser) : null,
    },
  });
}
