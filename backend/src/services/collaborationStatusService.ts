import { CourseProgress } from '../models/CourseProgress';
import { User } from '../models/User';
import { SESSION_CADENCE_DAYS } from '../constants/collaborationSessions';

export type CollaborationStatus = 'on_track' | 'overdue' | 'complete';

export interface CollaborationStatusResult {
  status: CollaborationStatus;
  completedCount: number;
  nextDueDate: Date | null;
  lastActivityAt: Date | null;
}

export function computeCollaborationStatus(sessions: CourseProgress[], assignedDate: Date): CollaborationStatusResult {
  const completedCount = sessions.filter((s) => s.completedAt).length;
  const lastCompletedAt = sessions.reduce<Date | null>((latest, s) => {
    if (!s.completedAt) return latest;
    return !latest || s.completedAt > latest ? s.completedAt : latest;
  }, null);

  if (completedCount >= sessions.length && sessions.length > 0) {
    return { status: 'complete', completedCount, nextDueDate: null, lastActivityAt: lastCompletedAt };
  }

  const anchor = lastCompletedAt ?? assignedDate;
  const nextDueDate = new Date(anchor);
  nextDueDate.setDate(nextDueDate.getDate() + SESSION_CADENCE_DAYS);

  const status: CollaborationStatus = new Date() > nextDueDate ? 'overdue' : 'on_track';
  return { status, completedCount, nextDueDate, lastActivityAt: lastCompletedAt };
}

export function fullName(u: User): string {
  return `${u.firstName} ${u.lastName}`;
}
