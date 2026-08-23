import { AppDataSource } from '../database/data-source';
import { Module } from '../models/Module';
import { ModuleAssignment } from '../models/ModuleAssignment';
import { User } from '../models/User';

const moduleRepo = () => AppDataSource.getRepository(Module);
const assignmentRepo = () => AppDataSource.getRepository(ModuleAssignment);
const userRepo = () => AppDataSource.getRepository(User);

function dueDateFor(assignedDate: Date, slaDays: number): Date {
  const due = new Date(assignedDate);
  due.setDate(due.getDate() + slaDays);
  return due;
}

async function insertAssignments(rows: { employeeId: string; moduleId: string; dueDate: Date }[]): Promise<void> {
  if (rows.length === 0) return;
  // ON CONFLICT DO NOTHING: employee/module pairs are unique, and this
  // helper is called from multiple triggers (registration, module create,
  // manual assign) that can legitimately overlap.
  await assignmentRepo()
    .createQueryBuilder()
    .insert()
    .values(rows.map((r) => ({ employeeId: r.employeeId, moduleId: r.moduleId, dueDate: r.dueDate })))
    .orIgnore()
    .execute();
}

/** Called when a new_joinee is created: assigns every current (non-archived) module version in their LOB. */
export async function assignAllLobModulesToEmployee(employeeId: string, lobId: string): Promise<void> {
  const modules = await moduleRepo().find({ where: { lobId, isArchived: false } });
  const now = new Date();
  await insertAssignments(modules.map((m) => ({ employeeId, moduleId: m.id, dueDate: dueDateFor(now, m.slaDays) })));
}

/** Called when a leader creates a module with assignAll: assigns every new_joinee currently in the module's LOB. */
export async function assignModuleToAllInLob(moduleId: string, lobId: string, slaDays: number): Promise<void> {
  const employees = await userRepo().find({ where: { lobId, role: 'new_joinee' } });
  const now = new Date();
  await insertAssignments(employees.map((e) => ({ employeeId: e.id, moduleId, dueDate: dueDateFor(now, slaDays) })));
}

/** Called when a leader assigns a module to specific employees. */
export async function assignModuleToEmployees(moduleId: string, employeeIds: string[], slaDays: number): Promise<void> {
  const now = new Date();
  await insertAssignments(employeeIds.map((employeeId) => ({ employeeId, moduleId, dueDate: dueDateFor(now, slaDays) })));
}
