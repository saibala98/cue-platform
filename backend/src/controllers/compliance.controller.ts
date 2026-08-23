import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { CompletionRecord } from '../models/CompletionRecord';
import { Module } from '../models/Module';
import { ModuleAssignment } from '../models/ModuleAssignment';
import { ModuleLesson } from '../models/ModuleLesson';
import { ModuleQuizQuestion } from '../models/ModuleQuizQuestion';
import { Lob } from '../models/Lob';
import { HttpError } from '../middleware/errorHandler';

const completionRepo = () => AppDataSource.getRepository(CompletionRecord);
const moduleRepo = () => AppDataSource.getRepository(Module);
const moduleAssignmentRepo = () => AppDataSource.getRepository(ModuleAssignment);
const lessonRepo = () => AppDataSource.getRepository(ModuleLesson);
const quizRepo = () => AppDataSource.getRepository(ModuleQuizQuestion);
const lobRepo = () => AppDataSource.getRepository(Lob);

interface AuditFilters {
  lobId?: string;
  moduleId?: string;
  from?: string;
  to?: string;
  status?: 'pass' | 'fail' | 'all';
  search?: string;
}

function parseFilters(req: Request): AuditFilters {
  const { lobId, moduleId, from, to, status, search } = req.query;
  return {
    lobId: typeof lobId === 'string' && lobId ? lobId : undefined,
    moduleId: typeof moduleId === 'string' && moduleId ? moduleId : undefined,
    from: typeof from === 'string' && from ? from : undefined,
    to: typeof to === 'string' && to ? to : undefined,
    status: status === 'pass' || status === 'fail' ? status : 'all',
    search: typeof search === 'string' && search.trim() ? search.trim().toLowerCase() : undefined,
  };
}

async function buildAuditRows(filters: AuditFilters) {
  const qb = completionRepo()
    .createQueryBuilder('c')
    .innerJoinAndSelect('c.employee', 'employee')
    .innerJoinAndSelect('c.module', 'module')
    .leftJoinAndSelect('employee.lob', 'lob')
    .orderBy('c.completed_at', 'DESC');

  if (filters.lobId) qb.andWhere('employee.lob_id = :lobId', { lobId: filters.lobId });
  if (filters.moduleId) qb.andWhere('c.module_id = :moduleId', { moduleId: filters.moduleId });
  if (filters.from) qb.andWhere('c.completed_at >= :from', { from: filters.from });
  if (filters.to) qb.andWhere('c.completed_at <= :to', { to: filters.to });
  if (filters.status === 'pass') qb.andWhere('c.score >= 70');
  if (filters.status === 'fail') qb.andWhere('c.score < 70');

  const records = await qb.getMany();

  const employeeIds = [...new Set(records.map((r) => r.employeeId))];
  const assignments = employeeIds.length
    ? await moduleAssignmentRepo().createQueryBuilder('a').where('a.employee_id IN (:...ids)', { ids: employeeIds }).getMany()
    : [];
  const assignmentByPair = new Map(assignments.map((a) => [`${a.employeeId}:${a.moduleId}`, a]));

  const rows = records
    .filter((r) => r.employee && r.module)
    .map((r) => {
      const assignment = assignmentByPair.get(`${r.employeeId}:${r.moduleId}`);
      const daysToComplete = assignment ? Math.round((r.completedAt.getTime() - assignment.assignedDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
      return {
        id: r.id,
        employeeName: `${r.employee!.firstName} ${r.employee!.lastName}`,
        employeeEmail: r.employee!.email,
        moduleTitle: r.module!.title,
        moduleVersion: r.moduleVersion,
        score: r.score,
        completedAt: r.completedAt,
        lobName: r.employee!.lob?.name ?? 'Unassigned',
        daysToComplete,
      };
    });

  if (filters.search) {
    return rows.filter((r) => r.employeeName.toLowerCase().includes(filters.search as string));
  }
  return rows;
}

export async function getAuditLog(req: Request, res: Response): Promise<void> {
  const rows = await buildAuditRows(parseFilters(req));
  res.json({ rows });
}

function csvEscape(value: string | number | null): string {
  const str = value === null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function exportAuditLog(req: Request, res: Response): Promise<void> {
  const filters = parseFilters(req);
  const rows = await buildAuditRows(filters);

  const header = ['Employee Name', 'Email', 'LOB', 'Module', 'Version', 'Score', 'Completed At'];
  const lines = [
    header.join(','),
    ...rows.map((r) => [r.employeeName, r.employeeEmail, r.lobName, r.moduleTitle, r.moduleVersion, r.score ?? '', r.completedAt.toISOString()].map(csvEscape).join(',')),
    '',
    '# This is an immutable record. Records cannot be modified.',
  ];

  let lobLabel = 'AllLOBs';
  if (filters.lobId) {
    const lob = await lobRepo().findOneBy({ id: filters.lobId });
    if (lob) lobLabel = lob.name.replace(/[^a-zA-Z0-9]+/g, '_');
  }
  const dateStamp = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="cue_audit_log_${lobLabel}_${dateStamp}.csv"`);
  res.send(lines.join('\n'));
}

export async function verifyIntegrity(_req: Request, res: Response): Promise<void> {
  const rows = await AppDataSource.query(`
    SELECT t.tgname AS trigger_name, t.tgenabled AS enabled, c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'completion_immutability' AND c.relname = 'completion_records' AND NOT t.tgisinternal;
  `);

  const trigger = rows[0];
  // tgenabled: 'O' = origin (enabled), 'D' = disabled, 'R'/'A' = replica/always
  const verified = Boolean(trigger) && trigger.enabled !== 'D';

  res.json({
    verified,
    checkedAt: new Date().toISOString(),
    triggerName: trigger?.trigger_name ?? null,
    tableName: trigger?.table_name ?? null,
  });
}

export async function getComplianceSummary(_req: Request, res: Response): Promise<void> {
  const [totalRecords, allRecords] = await Promise.all([completionRepo().count(), completionRepo().find()]);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const completionsThisMonth = allRecords.filter((r) => r.completedAt >= monthStart).length;

  const scored = allRecords.filter((r) => r.score !== null);
  const passRate = scored.length === 0 ? null : Math.round((scored.filter((r) => (r.score as number) >= 70).length / scored.length) * 100);

  const modules = await moduleRepo().find({ where: { isArchived: false } });
  let modulesFullyComplete = 0;
  for (const m of modules) {
    const assignedCount = await moduleAssignmentRepo().count({ where: { moduleId: m.id } });
    if (assignedCount === 0) continue;
    const completedEmployeeIds = new Set(allRecords.filter((r) => r.moduleId === m.id).map((r) => r.employeeId));
    if (completedEmployeeIds.size >= assignedCount) modulesFullyComplete += 1;
  }

  const assignments = await moduleAssignmentRepo().find();
  const completedPairs = new Set(allRecords.map((r) => `${r.employeeId}:${r.moduleId}`));
  const overdueCount = assignments.filter((a) => !completedPairs.has(`${a.employeeId}:${a.moduleId}`) && a.dueDate < now).length;

  res.json({
    totalRecords,
    completionsThisMonth,
    passRate,
    modulesFullyComplete,
    overdueCount,
  });
}

export async function listAllModules(_req: Request, res: Response): Promise<void> {
  const modules = await moduleRepo().find({ relations: { lob: true }, order: { title: 'ASC' } });
  res.json({ modules: modules.map((m) => ({ id: m.id, title: m.title, version: m.version, lobName: m.lob?.name ?? null })) });
}

export async function listModuleVersions(_req: Request, res: Response): Promise<void> {
  const modules = await moduleRepo().find({ order: { createdAt: 'ASC' } });
  const families = new Map<string, Module[]>();
  for (const m of modules) {
    const list = families.get(m.familyId) ?? [];
    list.push(m);
    families.set(m.familyId, list);
  }

  res.json({
    families: [...families.values()].map((versions) => {
      const current = versions.find((v) => !v.isArchived) ?? versions[versions.length - 1];
      return {
        familyId: current.familyId,
        title: current.title,
        currentVersionId: current.id,
        currentVersion: current.version,
        versions: versions.map((v) => ({
          id: v.id,
          version: v.version,
          slaDays: v.slaDays,
          isArchived: v.isArchived,
          createdAt: v.createdAt,
        })),
      };
    }),
  });
}

export async function createNewVersion(req: Request, res: Response): Promise<void> {
  const source = await moduleRepo().findOneBy({ id: req.params.id });
  if (!source) throw new HttpError(404, 'Module not found');

  const { version, slaDays } = req.body ?? {};
  if (typeof version !== 'string' || !version.trim()) throw new HttpError(400, 'version is required');

  const siblings = await moduleRepo().find({ where: { familyId: source.familyId } });
  if (siblings.some((s) => s.version === version.trim())) {
    throw new HttpError(409, `Version "${version.trim()}" already exists for this module`);
  }
  const resolvedSlaDays = slaDays === undefined || slaDays === null ? source.slaDays : Number(slaDays);
  if (!Number.isInteger(resolvedSlaDays) || resolvedSlaDays < 1) throw new HttpError(400, 'slaDays must be a positive integer');

  const [lessons, quizQuestions] = await Promise.all([
    lessonRepo().find({ where: { moduleId: source.id }, order: { orderIndex: 'ASC' } }),
    quizRepo().find({ where: { moduleId: source.id }, order: { orderIndex: 'ASC' } }),
  ]);

  const newModule = await AppDataSource.transaction(async (manager) => {
    // Archive every existing version in the family — only the newest is current.
    await manager.getRepository(Module).update({ familyId: source.familyId }, { isArchived: true });

    const created = manager.getRepository(Module).create({
      title: source.title,
      lobId: source.lobId,
      contentType: source.contentType,
      version: version.trim(),
      orderIndex: source.orderIndex,
      slaDays: resolvedSlaDays,
      familyId: source.familyId,
      isArchived: false,
    });
    await manager.getRepository(Module).save(created);

    if (lessons.length > 0) {
      await manager.getRepository(ModuleLesson).save(
        lessons.map((l) =>
          manager.getRepository(ModuleLesson).create({
            moduleId: created.id,
            title: l.title,
            orderIndex: l.orderIndex,
            contentType: l.contentType,
            contentBody: l.contentBody,
            contentUrl: l.contentUrl,
          }),
        ),
      );
    }
    if (quizQuestions.length > 0) {
      await manager.getRepository(ModuleQuizQuestion).save(
        quizQuestions.map((q) =>
          manager.getRepository(ModuleQuizQuestion).create({
            moduleId: created.id,
            questionText: q.questionText,
            orderIndex: q.orderIndex,
            options: q.options,
            correctIndex: q.correctIndex,
          }),
        ),
      );
    }

    return created;
  });

  res.status(201).json({
    module: { id: newModule.id, title: newModule.title, version: newModule.version, familyId: newModule.familyId },
  });
}
