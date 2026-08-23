import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  AdminModuleCompletionRow,
  AdminModuleSummary,
  AssignableJoinee,
  AssignableMentor,
  AssignedModule,
  AuditRow,
  AuthUser,
  ChatMessageView,
  ChecklistAssignment,
  CollaborationSession,
  CompletionRow,
  ComplianceModuleOption,
  DashboardModuleOption,
  DashboardSummaryData,
  KnowledgeMapEntry,
  LeaderAssignmentRow,
  MentorTableRow,
  ModuleDetail,
  ModuleProgress,
  ModuleVersionEntry,
  MyMenteeRow,
  MyMentorAssignment,
  OverdueItem,
} from '../types';
import { collaborationStatus, type DemoSession } from './mockData';
import { matchDemoAnswer, matchDemoTutorAnswer } from './mockChat';
import { getState, mutate, uid } from './mockStore';

const NOW = () => new Date().toISOString();
const TODAY = () => new Date();

class DemoApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function fail(status: number, message: string): never {
  throw new DemoApiError(status, message);
}

// ---------------------------------------------------------------- routing --

interface RouteMatch {
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  userId: string | null;
}

type Handler = (ctx: RouteMatch) => { status?: number; data?: unknown } | Promise<{ status?: number; data?: unknown }>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const ROUTES: Route[] = [];

function compile(path: string): { pattern: RegExp; keys: string[] } {
  const keys: string[] = [];
  const source = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { pattern: new RegExp(`^${source}$`), keys };
}

function on(method: string, path: string, handler: Handler): void {
  const { pattern, keys } = compile(path);
  ROUTES.push({ method, pattern, keys, handler });
}

function requireUser(ctx: RouteMatch): string {
  if (!ctx.userId) fail(401, 'Not authenticated.');
  const user = getState().users.find((u) => u.id === ctx.userId);
  if (!user) fail(401, 'Not authenticated.');
  return ctx.userId;
}

function currentUser(ctx: RouteMatch) {
  const id = requireUser(ctx);
  const user = getState().users.find((u) => u.id === id);
  if (!user) fail(401, 'Not authenticated.');
  return user;
}

function toPublicUser(u: { id: string; email: string; firstName: string; lastName: string; role: AuthUser['role']; lobId: string | null }): AuthUser {
  return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, lobId: u.lobId };
}

// -------------------------------------------------------------------- auth --

on('post', '/api/auth/login', ({ body }) => {
  const { email, password } = (body ?? {}) as { email?: string; password?: string };
  const user = getState().users.find((u) => u.email.toLowerCase() === (email ?? '').trim().toLowerCase());
  if (!user || user.password !== password) fail(401, 'Invalid email or password.');
  return { data: { token: `demo.${user.id}`, user: toPublicUser(user) } };
});

on('post', '/api/auth/register', ({ body }) => {
  const payload = (body ?? {}) as { email?: string; password?: string; firstName?: string; lastName?: string; role?: AuthUser['role']; lobId?: string };
  if (!payload.email || !payload.password || !payload.firstName || !payload.lastName || !payload.role) {
    fail(422, 'All fields are required.');
  }
  if (getState().users.some((u) => u.email.toLowerCase() === payload.email!.toLowerCase())) {
    fail(422, 'An account with that email already exists.');
  }
  const newUser = {
    id: uid('u'),
    email: payload.email!,
    password: payload.password!,
    firstName: payload.firstName!,
    lastName: payload.lastName!,
    role: payload.role!,
    lobId: payload.lobId ?? getState().lob.id,
  };
  mutate((s) => s.users.push(newUser));
  return { status: 201, data: { token: `demo.${newUser.id}`, user: toPublicUser(newUser) } };
});

on('post', '/api/auth/logout', () => ({ status: 204 }));

on('get', '/api/auth/me', (ctx) => {
  const user = currentUser(ctx);
  return { data: { user: toPublicUser(user) } };
});

// --------------------------------------------------------------------- lob --

on('get', '/api/lob', () => ({ data: { lobs: [getState().lob] } }));

// ---------------------------------------------------------------- modules --

on('get', '/api/modules/assigned', (ctx) => {
  const userId = requireUser(ctx);
  const s = getState();
  const rows: AssignedModule[] = s.moduleAssignments
    .filter((a) => a.userId === userId)
    .map((a) => {
      const mod = s.modules.find((m) => m.id === a.moduleId)!;
      return {
        assignmentId: a.id,
        moduleId: mod.id,
        title: mod.title,
        lobName: s.lob.name,
        version: mod.version,
        slaDays: mod.slaDays,
        assignedDate: a.assignedDate,
        dueDate: a.dueDate,
        status: a.status,
        score: a.score,
        completedAt: a.completedAt,
        overdue: a.status !== 'completed' && new Date(a.dueDate) < TODAY(),
      };
    });
  return { data: { modules: rows } };
});

on('get', '/api/modules/admin', () => {
  const s = getState();
  const rows: AdminModuleSummary[] = s.modules.map((mod) => {
    const assignments = s.moduleAssignments.filter((a) => a.moduleId === mod.id);
    const completed = assignments.filter((a) => a.status === 'completed').length;
    return {
      id: mod.id,
      title: mod.title,
      version: mod.version,
      slaDays: mod.slaDays,
      assignedCount: assignments.length,
      completedCount: completed,
      completionRate: assignments.length ? Math.round((completed / assignments.length) * 100) : 0,
    };
  });
  return { data: { modules: rows } };
});

on('post', '/api/modules/admin', ({ body }) => {
  const payload = (body ?? {}) as {
    title?: string; version?: string; slaDays?: number; lessons?: unknown[]; quizQuestions?: unknown[]; assignAll?: boolean; employeeIds?: string[];
  };
  if (!payload.title || !payload.version) fail(422, 'Title and version are required.');
  const mod = {
    id: uid('mod'),
    title: payload.title,
    version: payload.version,
    slaDays: payload.slaDays ?? 14,
    lobId: getState().lob.id,
    lessons: (payload.lessons ?? []).map((l, i) => {
      const lesson = l as { title: string; contentType: 'text' | 'url'; contentBody?: string; contentUrl?: string };
      return {
        id: uid('lsn'),
        title: lesson.title,
        orderIndex: i,
        contentType: lesson.contentType,
        contentBody: lesson.contentBody ?? null,
        contentUrl: lesson.contentUrl ?? null,
      };
    }),
    quizQuestions: (payload.quizQuestions ?? []).map((q, i) => {
      const quiz = q as { questionText: string; options: string[]; correctIndex: number };
      return { id: uid('qq'), questionText: quiz.questionText, orderIndex: i, options: quiz.options, correctIndex: quiz.correctIndex };
    }),
  };
  mutate((s) => s.modules.push(mod));

  if (payload.assignAll) {
    const targetIds = payload.employeeIds?.length
      ? payload.employeeIds
      : getState().users.filter((u) => u.role === 'new_joinee').map((u) => u.id);
    const today = TODAY();
    const due = new Date(today.getTime() + mod.slaDays * 86400000);
    mutate((s) => {
      for (const empId of targetIds) {
        if (s.moduleAssignments.some((a) => a.moduleId === mod.id && a.userId === empId)) continue;
        s.moduleAssignments.push({
          id: uid('ma'),
          moduleId: mod.id,
          userId: empId,
          assignedDate: today.toISOString().slice(0, 10),
          dueDate: due.toISOString().slice(0, 10),
          status: 'not_started',
          score: null,
          completedAt: null,
          startedAt: null,
        });
      }
    });
  }

  return { status: 201, data: { module: { id: mod.id, title: mod.title } } };
});

on('get', '/api/modules/admin/:id/completions', ({ params }) => {
  const s = getState();
  const rows: AdminModuleCompletionRow[] = s.moduleAssignments
    .filter((a) => a.moduleId === params.id)
    .map((a) => {
      const emp = s.users.find((u) => u.id === a.userId)!;
      return {
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        status: a.status,
        score: a.score,
        completedAt: a.completedAt,
        dueDate: a.dueDate,
        overdue: a.status !== 'completed' && new Date(a.dueDate) < TODAY(),
      };
    });
  return { data: { employees: rows } };
});

on('post', '/api/modules/admin/:id/assign', ({ params }) => {
  const s = getState();
  const mod = s.modules.find((m) => m.id === params.id);
  if (!mod) fail(404, 'Module not found.');
  const today = TODAY();
  const due = new Date(today.getTime() + mod!.slaDays * 86400000);
  mutate((state) => {
    const joinees = state.users.filter((u) => u.role === 'new_joinee');
    for (const emp of joinees) {
      if (state.moduleAssignments.some((a) => a.moduleId === mod!.id && a.userId === emp.id)) continue;
      state.moduleAssignments.push({
        id: uid('ma'),
        moduleId: mod!.id,
        userId: emp.id,
        assignedDate: today.toISOString().slice(0, 10),
        dueDate: due.toISOString().slice(0, 10),
        status: 'not_started',
        score: null,
        completedAt: null,
        startedAt: null,
      });
    }
  });
  return { status: 204 };
});

on('get', '/api/modules/:id/progress', (ctx) => {
  const userId = requireUser(ctx);
  const a = getState().moduleAssignments.find((x) => x.moduleId === ctx.params.id && x.userId === userId);
  if (!a) fail(404, 'Module not assigned.');
  const progress: ModuleProgress = {
    status: a!.status,
    score: a!.score,
    completedAt: a!.completedAt,
    dueDate: a!.dueDate,
    overdue: a!.status !== 'completed' && new Date(a!.dueDate) < TODAY(),
  };
  return { data: progress };
});

on('post', '/api/modules/:id/completion', (ctx) => {
  const userId = requireUser(ctx);
  const { answers } = (ctx.body ?? {}) as { answers?: number[] };
  const s = getState();
  const mod = s.modules.find((m) => m.id === ctx.params.id);
  if (!mod) fail(404, 'Module not found.');
  const assignment = s.moduleAssignments.find((a) => a.moduleId === ctx.params.id && a.userId === userId);
  if (!assignment) fail(404, 'Module not assigned.');

  let score: number | null = null;
  if (answers && answers.length > 0 && mod!.quizQuestions.length > 0) {
    const correct = mod!.quizQuestions.filter((q, i) => answers[i] === q.correctIndex).length;
    score = Math.round((correct / mod!.quizQuestions.length) * 100);
  }

  mutate((state) => {
    const a = state.moduleAssignments.find((x) => x.id === assignment!.id)!;
    a.status = 'completed';
    a.completedAt = NOW();
    a.score = score;
  });

  return { data: { score } };
});

on('get', '/api/modules/:id', (ctx) => {
  const userId = requireUser(ctx);
  const s = getState();
  const mod = s.modules.find((m) => m.id === ctx.params.id);
  if (!mod) fail(404, 'Module not found.');
  const assignment = s.moduleAssignments.find((a) => a.moduleId === ctx.params.id && a.userId === userId);
  const detail: ModuleDetail = {
    module: { id: mod!.id, title: mod!.title, lobName: s.lob.name, version: mod!.version, slaDays: mod!.slaDays },
    lessons: mod!.lessons,
    quizQuestions: mod!.quizQuestions.map((q) => ({ id: q.id, questionText: q.questionText, orderIndex: q.orderIndex, options: q.options })),
    progress: assignment ? { status: assignment.status, dueDate: assignment.dueDate, startedAt: assignment.startedAt } : null,
  };
  return { data: detail };
});

// ----------------------------------------------------------------- leader --

on('get', '/api/leader/joinees', () => {
  const rows: AssignableJoinee[] = getState()
    .users.filter((u) => u.role === 'new_joinee')
    .map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }));
  return { data: { joinees: rows } };
});

function weekWindow(): Date {
  return new Date(TODAY().getTime() - 7 * 86400000);
}

on('get', '/api/leader/dashboard/summary', () => {
  const s = getState();
  const since = weekWindow();
  const modulesCompletedThisWeek = s.moduleAssignments.filter((a) => a.completedAt && new Date(a.completedAt) >= since).length;
  const overdueModules = s.moduleAssignments.filter((a) => a.status !== 'completed' && new Date(a.dueDate) < TODAY()).length;
  const sessionsCompletedThisWeek = s.mentorAssignments
    .flatMap((m) => m.sessions)
    .filter((sess) => sess.completedAt && new Date(sess.completedAt) >= since).length;
  const data: DashboardSummaryData = {
    totalNewJoinees: s.users.filter((u) => u.role === 'new_joinee').length,
    modulesCompletedThisWeek,
    overdueModules,
    mentorAssignmentsActive: s.mentorAssignments.length,
    sessionsCompletedThisWeek,
  };
  return { data };
});

on('get', '/api/leader/dashboard/completions', () => {
  const s = getState();
  const rows: CompletionRow[] = s.moduleAssignments.map((a) => {
    const emp = s.users.find((u) => u.id === a.userId)!;
    const mod = s.modules.find((m) => m.id === a.moduleId)!;
    const overdue = a.status !== 'completed' && new Date(a.dueDate) < TODAY();
    return {
      moduleAssignmentId: a.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      moduleName: mod.title,
      moduleVersion: mod.version,
      assignedDate: a.assignedDate,
      dueDate: a.dueDate,
      completionDate: a.completedAt,
      score: a.score,
      status: overdue ? 'overdue' : a.status === 'not_started' ? 'not_started' : a.status === 'in_progress' ? 'in_progress' : 'completed',
    };
  });
  return { data: { rows } };
});

on('get', '/api/leader/dashboard/mentors', () => {
  const s = getState();
  const rows: MentorTableRow[] = s.mentorAssignments.map((m) => {
    const mentor = s.users.find((u) => u.id === m.mentorId)!;
    const mentee = s.users.find((u) => u.id === m.menteeId)!;
    const completed = m.sessions.filter((sess) => sess.completedAt);
    const lastDate = completed.length ? completed[completed.length - 1].completedAt! : m.assignedDate;
    const daysSince = Math.floor((TODAY().getTime() - new Date(lastDate).getTime()) / 86400000);
    return {
      assignmentId: m.id,
      menteeName: `${mentee.firstName} ${mentee.lastName}`,
      mentorName: `${mentor.firstName} ${mentor.lastName}`,
      assignedDate: m.assignedDate,
      sessionsCompleted: completed.length,
      totalSessions: m.sessions.length,
      daysSinceLastSession: daysSince,
      status: collaborationStatus(m.sessions),
    };
  });
  return { data: { rows } };
});

on('get', '/api/leader/dashboard/overdue', () => {
  const s = getState();
  const items: OverdueItem[] = [];
  for (const a of s.moduleAssignments) {
    if (a.status === 'completed' || new Date(a.dueDate) >= TODAY()) continue;
    const emp = s.users.find((u) => u.id === a.userId)!;
    const mod = s.modules.find((m) => m.id === a.moduleId)!;
    const reminder = s.reminders[`module_assignment:${a.id}`];
    items.push({
      targetType: 'module_assignment',
      targetId: a.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      what: mod.title,
      daysOverdue: Math.floor((TODAY().getTime() - new Date(a.dueDate).getTime()) / 86400000),
      reminderSent: reminder?.sent ?? false,
      reminderSentAt: reminder?.sentAt ?? null,
    });
  }
  for (const m of s.mentorAssignments) {
    const next = m.sessions.find((sess) => !sess.completedAt);
    if (!next?.dueDate || new Date(next.dueDate) >= TODAY()) continue;
    const mentee = s.users.find((u) => u.id === m.menteeId)!;
    const reminder = s.reminders[`course_progress:${m.id}`];
    items.push({
      targetType: 'course_progress',
      targetId: m.id,
      employeeName: `${mentee.firstName} ${mentee.lastName}`,
      what: next.title,
      daysOverdue: Math.floor((TODAY().getTime() - new Date(next.dueDate).getTime()) / 86400000),
      reminderSent: reminder?.sent ?? false,
      reminderSentAt: reminder?.sentAt ?? null,
    });
  }
  return { data: { items } };
});

on('post', '/api/leader/dashboard/overdue/:targetType/:targetId/remind', ({ params }) => {
  const key = `${params.targetType}:${params.targetId}`;
  mutate((s) => {
    s.reminders[key] = { sent: true, sentAt: NOW() };
  });
  return { status: 204 };
});

on('get', '/api/leader/dashboard/modules', () => {
  const rows: DashboardModuleOption[] = getState().modules.map((m) => ({ id: m.id, title: m.title, version: m.version }));
  return { data: { modules: rows } };
});

on('get', '/api/leader/dashboard/export', () => {
  const rows = getState().moduleAssignments;
  const s = getState();
  const header = 'Employee,Module,Version,Assigned,Due,Completed,Score,Status\n';
  const body = rows
    .map((a) => {
      const emp = s.users.find((u) => u.id === a.userId)!;
      const mod = s.modules.find((m) => m.id === a.moduleId)!;
      return [`${emp.firstName} ${emp.lastName}`, mod.title, mod.version, a.assignedDate, a.dueDate, a.completedAt ?? '', a.score ?? '', a.status].join(',');
    })
    .join('\n');
  return { data: new Blob([header + body], { type: 'text/csv' }) };
});

// ---------------------------------------------------------------- mentors --

on('get', '/api/mentors/unassigned-joinees', () => {
  const s = getState();
  const assignedIds = new Set(s.mentorAssignments.map((m) => m.menteeId));
  const rows: AssignableJoinee[] = s.users
    .filter((u) => u.role === 'new_joinee' && !assignedIds.has(u.id))
    .map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }));
  return { data: { joinees: rows } };
});

on('get', '/api/mentors/available-mentors', () => {
  const s = getState();
  const rows: AssignableMentor[] = s.users
    .filter((u) => u.role === 'mentor')
    .map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, menteeCount: s.mentorAssignments.filter((m) => m.mentorId === u.id).length }));
  return { data: { mentors: rows } };
});

on('post', '/api/mentors/assign', ({ body }) => {
  const { mentorId, menteeId } = (body ?? {}) as { mentorId?: string; menteeId?: string };
  if (!mentorId || !menteeId) fail(422, 'mentorId and menteeId are required.');
  mutate((s) => {
    s.mentorAssignments.push({
      id: uid('ma-mentor'),
      mentorId,
      menteeId,
      assignedDate: TODAY().toISOString().slice(0, 10),
      sessions: Array.from({ length: 6 }).map((_, i) => ({
        sessionNumber: i + 1,
        title: ['Welcome & Team Introductions', 'Systems & Access Walkthrough', 'Shadowing: Live Transaction Review', 'Mid-Point Check-In', 'Independent Case Walkthrough', '30-Day Retrospective'][i],
        description: '',
        completedAt: null,
        notes: null,
        completedByName: null,
        dueDate: i === 0 ? new Date(TODAY().getTime() + 7 * 86400000).toISOString().slice(0, 10) : null,
      })),
    });
  });
  return { status: 201 };
});

on('get', '/api/mentors/assignments', () => {
  const s = getState();
  const rows: LeaderAssignmentRow[] = s.mentorAssignments.map((m) => {
    const mentor = s.users.find((u) => u.id === m.mentorId)!;
    const mentee = s.users.find((u) => u.id === m.menteeId)!;
    const completed = m.sessions.filter((sess) => sess.completedAt).length;
    return {
      id: m.id,
      menteeName: `${mentee.firstName} ${mentee.lastName}`,
      mentorName: `${mentor.firstName} ${mentor.lastName}`,
      assignedDate: m.assignedDate,
      sessionsCompleted: completed,
      totalSessions: m.sessions.length,
      status: collaborationStatus(m.sessions),
    };
  });
  return { data: { assignments: rows } };
});

on('get', '/api/mentors/my-assignment', (ctx) => {
  const userId = requireUser(ctx);
  const s = getState();
  const m = s.mentorAssignments.find((a) => a.menteeId === userId);
  if (!m) return { data: { assignment: null } };
  const mentor = s.users.find((u) => u.id === m.mentorId)!;
  const completed = m.sessions.filter((sess) => sess.completedAt);
  const next = m.sessions.find((sess) => !sess.completedAt);
  const assignment: MyMentorAssignment = {
    id: m.id,
    assignedDate: m.assignedDate,
    mentor: { id: mentor.id, name: `${mentor.firstName} ${mentor.lastName}`, role: mentor.role, email: mentor.email },
    sessionsCompleted: completed.length,
    totalSessions: m.sessions.length,
    status: collaborationStatus(m.sessions),
    nextDueDate: next?.dueDate ?? null,
  };
  return { data: { assignment } };
});

on('get', '/api/mentors/my-mentees', (ctx) => {
  const userId = requireUser(ctx);
  const s = getState();
  const rows: MyMenteeRow[] = s.mentorAssignments
    .filter((m) => m.mentorId === userId)
    .map((m) => {
      const mentee = s.users.find((u) => u.id === m.menteeId)!;
      const completed = m.sessions.filter((sess) => sess.completedAt);
      const modAssignments = s.moduleAssignments.filter((a) => a.userId === mentee.id);
      return {
        assignmentId: m.id,
        menteeId: mentee.id,
        menteeName: `${mentee.firstName} ${mentee.lastName}`,
        menteeEmail: mentee.email,
        assignedDate: m.assignedDate,
        sessionsCompleted: completed.length,
        totalSessions: m.sessions.length,
        status: collaborationStatus(m.sessions),
        modulesCompleted: modAssignments.filter((a) => a.status === 'completed').length,
        modulesAssigned: modAssignments.length,
      };
    });
  return { data: { mentees: rows } };
});

on('get', '/api/mentors/checklist/:assignmentId', ({ params }) => {
  const s = getState();
  const m = s.mentorAssignments.find((a) => a.id === params.assignmentId);
  if (!m) fail(404, 'Assignment not found.');
  const mentor = s.users.find((u) => u.id === m!.mentorId)!;
  const mentee = s.users.find((u) => u.id === m!.menteeId)!;
  const completed = m!.sessions.filter((sess) => sess.completedAt).length;
  const assignment: ChecklistAssignment = {
    id: m!.id,
    mentorName: `${mentor.firstName} ${mentor.lastName}`,
    menteeName: `${mentee.firstName} ${mentee.lastName}`,
    assignedDate: m!.assignedDate,
    status: collaborationStatus(m!.sessions),
    sessionsCompleted: completed,
    totalSessions: m!.sessions.length,
  };
  const sessions: CollaborationSession[] = m!.sessions;
  return { data: { assignment, sessions } };
});

on('post', '/api/mentors/checklist/:assignmentId/session/:sessionNumber/complete', (ctx) => {
  const user = currentUser(ctx);
  const { notes } = (ctx.body ?? {}) as { notes?: string };
  const sessionNumber = Number(ctx.params.sessionNumber);
  mutate((s) => {
    const m = s.mentorAssignments.find((a) => a.id === ctx.params.assignmentId);
    if (!m) fail(404, 'Assignment not found.');
    const sess: DemoSession | undefined = m!.sessions.find((x) => x.sessionNumber === sessionNumber);
    if (!sess) fail(404, 'Session not found.');
    sess!.completedAt = NOW();
    sess!.notes = notes ?? null;
    sess!.completedByName = `${user.firstName} ${user.lastName}`;
    const next = m!.sessions.find((x) => !x.completedAt);
    if (next) next.dueDate = new Date(TODAY().getTime() + 7 * 86400000).toISOString().slice(0, 10);
  });
  return { status: 204 };
});

// ------------------------------------------------------------ knowledge map --

on('get', '/api/knowledge-map/search', ({ query }) => {
  const q = String((query as { q?: string }).q ?? '').toLowerCase();
  const entries = getState().knowledgeMap.filter((e) => `${e.topic} ${e.description ?? ''}`.toLowerCase().includes(q));
  return { data: { entries } };
});

on('get', '/api/knowledge-map/:id', ({ params }) => {
  const entry = getState().knowledgeMap.find((e) => e.id === params.id);
  if (!entry) fail(404, 'Entry not found.');
  return { data: { entry } };
});

on('get', '/api/knowledge-map', () => ({ data: { entries: getState().knowledgeMap } }));

on('post', '/api/knowledge-map', (ctx) => {
  const user = currentUser(ctx);
  const body = (ctx.body ?? {}) as Partial<KnowledgeMapEntry>;
  if (!body.topic || !body.ownerName || !body.goToContactName) fail(422, 'Topic, owner, and go-to contact are required.');
  const entry: KnowledgeMapEntry = {
    id: uid('km'),
    lobId: getState().lob.id,
    lobName: getState().lob.name,
    topic: body.topic!,
    description: body.description ?? null,
    ownerName: body.ownerName!,
    ownerEmail: body.ownerEmail ?? null,
    goToContactName: body.goToContactName!,
    goToContactEmail: body.goToContactEmail ?? null,
    goToContactRole: body.goToContactRole ?? null,
    approverName: body.approverName ?? null,
    approverEmail: body.approverEmail ?? null,
    approverRole: body.approverRole ?? null,
    notes: body.notes ?? null,
    lastUpdatedByName: `${user.firstName} ${user.lastName}`,
    lastUpdatedAt: NOW(),
  };
  mutate((s) => s.knowledgeMap.push(entry));
  return { status: 201, data: { entry } };
});

on('put', '/api/knowledge-map/:id', (ctx) => {
  const user = currentUser(ctx);
  const body = (ctx.body ?? {}) as Partial<KnowledgeMapEntry>;
  const updated = mutate((s) => {
    const entry = s.knowledgeMap.find((e) => e.id === ctx.params.id);
    if (!entry) fail(404, 'Entry not found.');
    Object.assign(entry!, {
      topic: body.topic ?? entry!.topic,
      description: body.description ?? null,
      ownerName: body.ownerName ?? entry!.ownerName,
      ownerEmail: body.ownerEmail ?? null,
      goToContactName: body.goToContactName ?? entry!.goToContactName,
      goToContactEmail: body.goToContactEmail ?? null,
      goToContactRole: body.goToContactRole ?? null,
      approverName: body.approverName ?? null,
      approverEmail: body.approverEmail ?? null,
      approverRole: body.approverRole ?? null,
      notes: body.notes ?? null,
      lastUpdatedByName: `${user.firstName} ${user.lastName}`,
      lastUpdatedAt: NOW(),
    });
    return entry;
  });
  return { data: { entry: updated } };
});

on('delete', '/api/knowledge-map/:id', ({ params }) => {
  mutate((s) => {
    const idx = s.knowledgeMap.findIndex((e) => e.id === params.id);
    if (idx === -1) fail(404, 'Entry not found.');
    s.knowledgeMap.splice(idx, 1);
  });
  return { status: 204 };
});

// -------------------------------------------------------------------- ai --

function newAssistantMessage(question: string): { user: ChatMessageView; assistant: ChatMessageView } {
  const answer = matchDemoAnswer(question);
  const user: ChatMessageView = { id: uid('msg'), role: 'user', content: question, answerType: null, metadata: null, createdAt: NOW() };
  const assistant: ChatMessageView = {
    id: uid('msg'),
    role: 'assistant',
    content: answer.content,
    answerType: answer.answerType,
    metadata: answer.metadata,
    createdAt: NOW(),
  };
  return { user, assistant };
}

on('post', '/api/ai/chat', (ctx) => {
  const userId = requireUser(ctx);
  const { message } = (ctx.body ?? {}) as { message?: string };
  if (!message?.trim()) fail(422, 'Message is required.');
  const { user, assistant } = newAssistantMessage(message.trim());
  const conversationId = uid('conv');
  mutate((s) => {
    s.conversations.push({
      id: conversationId,
      userId,
      title: message.trim().slice(0, 60),
      createdAt: NOW(),
      updatedAt: NOW(),
      messages: [user, assistant],
    });
  });
  return { status: 201, data: { conversationId, title: message.trim().slice(0, 60), messages: [user, assistant] } };
});

on('post', '/api/ai/conversations/:id/message', (ctx) => {
  const { message } = (ctx.body ?? {}) as { message?: string };
  if (!message?.trim()) fail(422, 'Message is required.');
  const { user, assistant } = newAssistantMessage(message.trim());
  mutate((s) => {
    const convo = s.conversations.find((c) => c.id === ctx.params.id);
    if (!convo) fail(404, 'Conversation not found.');
    convo!.messages.push(user, assistant);
    convo!.updatedAt = NOW();
  });
  return { data: { messages: [user, assistant] } };
});

on('get', '/api/ai/conversations', (ctx) => {
  const userId = requireUser(ctx);
  const rows = getState()
    .conversations.filter((c) => c.userId === userId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt }));
  return { data: { conversations: rows } };
});

on('get', '/api/ai/conversations/:id', ({ params }) => {
  const convo = getState().conversations.find((c) => c.id === params.id);
  if (!convo) fail(404, 'Conversation not found.');
  return { data: { conversation: { id: convo!.id, title: convo!.title, createdAt: convo!.createdAt, updatedAt: convo!.updatedAt }, messages: convo!.messages } };
});

on('post', '/api/ai/tutor', (ctx) => {
  const { stuckMessage } = (ctx.body ?? {}) as { moduleId?: string; quizQuestionId?: string; stuckMessage?: string };
  if (!stuckMessage?.trim()) fail(422, 'stuckMessage is required.');
  const answer = matchDemoTutorAnswer(stuckMessage.trim());
  return { data: answer };
});

// -------------------------------------------------------------- documents --

on('get', '/api/documents', () => {
  const rows = getState().documents.map((d) => ({
    id: d.id, fileName: d.fileName, fileType: d.fileType, fileSize: d.fileSize, status: d.status,
    chunkCount: d.chunks.length, errorMessage: d.errorMessage, uploadedAt: d.uploadedAt,
  }));
  return { data: { documents: rows } };
});

on('post', '/api/documents/upload', (ctx) => {
  const form = ctx.body as FormData | undefined;
  const file = form?.get ? (form.get('file') as File | null) : null;
  const fileName = file?.name ?? `uploaded-document-${Date.now()}.pdf`;
  const doc = {
    id: uid('doc'),
    fileName,
    fileType: file?.type || 'application/octet-stream',
    fileSize: file?.size ?? 128_000,
    status: 'processing' as const,
    errorMessage: null,
    uploadedAt: NOW(),
    chunks: [],
  };
  mutate((s) => s.documents.push(doc));
  setTimeout(() => {
    mutate((s) => {
      const d = s.documents.find((x) => x.id === doc.id);
      if (!d) return;
      d.status = 'ready';
      d.chunks = [
        {
          id: uid('chunk'),
          chunkIndex: 0,
          chunkText: 'This is a demo document. In demo mode, uploaded files are not actually parsed — this placeholder chunk stands in for real extracted content.',
          metadata: { fileName: d.fileName, totalChunks: 1, sectionHeader: null, pageNumber: null },
        },
      ];
    });
  }, 2500);
  return { status: 201, data: { document: { id: doc.id, fileName: doc.fileName, fileType: doc.fileType, fileSize: doc.fileSize, status: doc.status, chunkCount: 0, errorMessage: null, uploadedAt: doc.uploadedAt } } };
});

on('post', '/api/documents/search', (ctx) => {
  const { query } = (ctx.body ?? {}) as { query?: string };
  const q = (query ?? '').toLowerCase();
  const results = getState()
    .documents.flatMap((d) => d.chunks.map((c) => ({ doc: d, chunk: c })))
    .filter(({ chunk }) => chunk.chunkText.toLowerCase().includes(q))
    .slice(0, 5)
    .map(({ doc, chunk }) => ({
      chunkId: chunk.id, documentId: doc.id, documentName: doc.fileName, chunkText: chunk.chunkText, chunkIndex: chunk.chunkIndex, relevanceScore: 0.9,
    }));
  return { data: { results } };
});

on('get', '/api/documents/:id/chunks', ({ params }) => {
  const doc = getState().documents.find((d) => d.id === params.id);
  if (!doc) fail(404, 'Document not found.');
  return { data: { chunks: doc!.chunks } };
});

on('get', '/api/documents/:id/download', ({ params }) => {
  const doc = getState().documents.find((d) => d.id === params.id);
  if (!doc) fail(404, 'Document not found.');
  const text = doc!.chunks.map((c) => c.chunkText).join('\n\n') || 'Demo document placeholder content.';
  return { data: new Blob([text], { type: 'text/plain' }) };
});

on('post', '/api/documents/:id/retry', ({ params }) => {
  mutate((s) => {
    const doc = s.documents.find((d) => d.id === params.id);
    if (!doc) fail(404, 'Document not found.');
    doc!.status = 'ready';
    doc!.errorMessage = null;
  });
  return { status: 204 };
});

on('delete', '/api/documents/:id', ({ params }) => {
  mutate((s) => {
    const idx = s.documents.findIndex((d) => d.id === params.id);
    if (idx === -1) fail(404, 'Document not found.');
    s.documents.splice(idx, 1);
  });
  return { status: 204 };
});

on('get', '/api/documents/:id', ({ params }) => {
  const doc = getState().documents.find((d) => d.id === params.id);
  if (!doc) fail(404, 'Document not found.');
  return {
    data: {
      document: { id: doc!.id, fileName: doc!.fileName, fileType: doc!.fileType, fileSize: doc!.fileSize, status: doc!.status, chunkCount: doc!.chunks.length, errorMessage: doc!.errorMessage, uploadedAt: doc!.uploadedAt },
      chunks: doc!.chunks,
    },
  };
});

// ------------------------------------------------------------ compliance --

on('get', '/api/compliance/summary', () => {
  const s = getState();
  const monthRows = s.auditLog.filter((r) => r.completedAt.startsWith('2026-08'));
  const scored = s.auditLog.filter((r) => r.score !== null);
  return {
    data: {
      totalRecords: s.auditLog.length,
      completionsThisMonth: monthRows.length,
      passRate: scored.length ? Math.round((scored.filter((r) => (r.score ?? 0) >= 70).length / scored.length) * 100) : null,
      modulesFullyComplete: 1,
      overdueCount: s.moduleAssignments.filter((a) => a.status !== 'completed' && new Date(a.dueDate) < TODAY()).length,
    },
  };
});

on('get', '/api/compliance/audit-log/export', ({ query }) => {
  const rows = filterAuditRows(query);
  const header = 'Employee,Email,LOB,Module,Version,Score,Completed,Days To Complete\n';
  const body = rows.map((r) => [r.employeeName, r.employeeEmail, r.lobName, r.moduleTitle, r.moduleVersion, r.score ?? '', r.completedAt, r.daysToComplete ?? ''].join(',')).join('\n');
  return { data: new Blob([header + body], { type: 'text/csv' }) };
});

on('get', '/api/compliance/audit-log/verify', () => ({
  data: { verified: true, checkedAt: NOW(), triggerName: 'audit_log_immutability_trigger', tableName: 'module_completions_audit' },
}));

function filterAuditRows(query: Record<string, unknown>): AuditRow[] {
  let rows = getState().auditLog;
  const q = query as { moduleId?: string; from?: string; to?: string; status?: string; search?: string };
  if (q.moduleId) {
    const mod = getState().modules.find((m) => m.id === q.moduleId);
    if (mod) rows = rows.filter((r) => r.moduleTitle === mod.title);
  }
  if (q.from) rows = rows.filter((r) => r.completedAt >= q.from!);
  if (q.to) rows = rows.filter((r) => r.completedAt <= `${q.to}T23:59:59.999Z`);
  if (q.status === 'pass') rows = rows.filter((r) => (r.score ?? 0) >= 70);
  if (q.status === 'fail') rows = rows.filter((r) => (r.score ?? 0) < 70);
  if (q.search) {
    const term = q.search.toLowerCase();
    rows = rows.filter((r) => r.employeeName.toLowerCase().includes(term));
  }
  return rows;
}

on('get', '/api/compliance/audit-log', ({ query }) => ({ data: { rows: filterAuditRows(query) } }));

on('get', '/api/compliance/modules', () => {
  const rows: ComplianceModuleOption[] = getState().modules.map((m) => ({ id: m.id, title: m.title, version: m.version, lobName: getState().lob.name }));
  return { data: { modules: rows } };
});

on('get', '/api/compliance/modules/versions', () => ({ data: { families: getState().moduleVersionFamilies } }));

on('post', '/api/compliance/modules/:id/new-version', (ctx) => {
  const { version, slaDays } = (ctx.body ?? {}) as { version?: string; slaDays?: number };
  if (!version) fail(422, 'version is required.');
  mutate((s) => {
    const family = s.moduleVersionFamilies.find((f) => f.currentVersionId === ctx.params.id || f.familyId === ctx.params.id);
    if (!family) fail(404, 'Module family not found.');
    const newEntry: ModuleVersionEntry = { id: uid('mod-ver'), version: version!, slaDays: slaDays ?? 14, isArchived: false, createdAt: NOW() };
    family!.versions = family!.versions.map((v) => (v.id === family!.currentVersionId ? { ...v, isArchived: true } : v));
    family!.versions.push(newEntry);
    family!.currentVersionId = newEntry.id;
    family!.currentVersion = newEntry.version;
  });
  return { status: 201 };
});

// -------------------------------------------------------------- response helpers --

function makeResponse(config: InternalAxiosRequestConfig, data: unknown, status: number): AxiosResponse {
  return {
    data,
    status,
    statusText: status < 300 ? 'OK' : 'Error',
    headers: {},
    config,
    request: {},
  } as AxiosResponse;
}

function makeError(config: InternalAxiosRequestConfig, status: number, message: string) {
  return Object.assign(new Error(message), {
    isAxiosError: true,
    response: { data: { error: message }, status, statusText: 'Error', headers: {}, config },
    config,
    toJSON: () => ({ message }),
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractBody(config: InternalAxiosRequestConfig): unknown {
  const data = config.data;
  if (data === undefined || data === null) return undefined;
  if (typeof FormData !== 'undefined' && data instanceof FormData) return data;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }
  return data;
}

function extractAuthToken(config: InternalAxiosRequestConfig): string | null {
  const headers = config.headers as unknown as Record<string, unknown> | undefined;
  const raw = headers?.Authorization ?? headers?.authorization;
  if (typeof raw !== 'string') return null;
  const [, token] = raw.split(' ');
  return token ?? null;
}

export const mockAdapter: AxiosAdapter = async (config) => {
  await delay(250 + Math.random() * 250);

  const path = new URL(config.url ?? '', 'http://demo.local').pathname;
  const method = (config.method ?? 'get').toLowerCase();
  const query = (config.params ?? {}) as Record<string, unknown>;
  const body = extractBody(config);
  const token = extractAuthToken(config);
  const userId = token?.startsWith('demo.') ? token.slice('demo.'.length) : null;

  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(path);
    if (!match) continue;
    const params: Record<string, string> = {};
    route.keys.forEach((key, i) => {
      params[key] = decodeURIComponent(match[i + 1]);
    });
    try {
      const result = await route.handler({ params, query, body, userId });
      return makeResponse(config, result.data, result.status ?? 200);
    } catch (err) {
      if (err instanceof DemoApiError) throw makeError(config, err.status, err.message);
      // eslint-disable-next-line no-console
      console.error('[demo mode] handler error', err);
      throw makeError(config, 500, 'Something went wrong in demo mode.');
    }
  }

  throw makeError(config, 404, `No demo handler for ${method.toUpperCase()} ${path}`);
};
