import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { KnowledgeMap } from '../models/KnowledgeMap';
import { User } from '../models/User';
import { HttpError } from '../middleware/errorHandler';

const knowledgeMapRepo = () => AppDataSource.getRepository(KnowledgeMap);
const userRepo = () => AppDataSource.getRepository(User);

function toView(entry: KnowledgeMap) {
  return {
    id: entry.id,
    lobId: entry.lobId,
    lobName: entry.lob?.name ?? null,
    topic: entry.topic,
    description: entry.description,
    ownerName: entry.ownerName,
    ownerEmail: entry.ownerEmail,
    goToContactName: entry.goToContactName,
    goToContactEmail: entry.goToContactEmail,
    goToContactRole: entry.goToContactRole,
    approverName: entry.approverName,
    approverEmail: entry.approverEmail,
    approverRole: entry.approverRole,
    notes: entry.notes,
    lastUpdatedByName: entry.lastUpdatedByUser ? `${entry.lastUpdatedByUser.firstName} ${entry.lastUpdatedByUser.lastName}` : null,
    lastUpdatedAt: entry.lastUpdatedAt,
  };
}

async function resolveLobId(req: Request): Promise<string | null> {
  const queryLobId = req.query.lobId as string | undefined;
  if (queryLobId) return queryLobId;
  const user = await userRepo().findOneBy({ id: req.userId });
  return user?.lobId ?? null;
}

export async function listEntries(req: Request, res: Response): Promise<void> {
  const lobId = await resolveLobId(req);
  if (!lobId) {
    res.json({ entries: [] });
    return;
  }

  const entries = await knowledgeMapRepo().find({
    where: { lobId },
    relations: { lob: true, lastUpdatedByUser: true },
    order: { topic: 'ASC' },
  });
  res.json({ entries: entries.map(toView) });
}

export async function searchEntries(req: Request, res: Response): Promise<void> {
  const lobId = await resolveLobId(req);
  const { q } = req.query;
  if (!lobId || typeof q !== 'string' || !q.trim()) {
    res.json({ entries: [] });
    return;
  }

  const terms = (q.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).filter(Boolean);
  const entries = await knowledgeMapRepo().find({ where: { lobId }, relations: { lob: true, lastUpdatedByUser: true } });

  const scored = entries
    .map((entry) => {
      const haystack = `${entry.topic} ${entry.description ?? ''} ${entry.ownerName} ${entry.goToContactName} ${entry.approverName ?? ''}`.toLowerCase();
      const score = terms.reduce((count, term) => (haystack.includes(term) ? count + 1 : count), 0);
      return { entry, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  res.json({ entries: scored.map((s) => toView(s.entry)) });
}

export async function getEntry(req: Request, res: Response): Promise<void> {
  const entry = await knowledgeMapRepo().findOne({ where: { id: req.params.id }, relations: { lob: true, lastUpdatedByUser: true } });
  if (!entry) throw new HttpError(404, 'Knowledge map entry not found');
  res.json({ entry: toView(entry) });
}

interface EntryInput {
  topic?: unknown;
  description?: unknown;
  lobId?: unknown;
  ownerName?: unknown;
  ownerEmail?: unknown;
  goToContactName?: unknown;
  goToContactEmail?: unknown;
  goToContactRole?: unknown;
  approverName?: unknown;
  approverEmail?: unknown;
  approverRole?: unknown;
  notes?: unknown;
}

function validateEntryInput(body: EntryInput, leaderLobId: string) {
  if (typeof body.topic !== 'string' || !body.topic.trim()) throw new HttpError(400, 'topic is required');
  if (typeof body.ownerName !== 'string' || !body.ownerName.trim()) throw new HttpError(400, 'ownerName is required');
  if (typeof body.goToContactName !== 'string' || !body.goToContactName.trim()) throw new HttpError(400, 'goToContactName is required');

  const optionalString = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

  return {
    topic: body.topic.trim(),
    description: optionalString(body.description),
    lobId: typeof body.lobId === 'string' && body.lobId ? body.lobId : leaderLobId,
    ownerName: body.ownerName.trim(),
    ownerEmail: optionalString(body.ownerEmail),
    goToContactName: body.goToContactName.trim(),
    goToContactEmail: optionalString(body.goToContactEmail),
    goToContactRole: optionalString(body.goToContactRole),
    approverName: optionalString(body.approverName),
    approverEmail: optionalString(body.approverEmail),
    approverRole: optionalString(body.approverRole),
    notes: optionalString(body.notes),
  };
}

export async function createEntry(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) throw new HttpError(400, 'Your account has no line of business set');

  const input = validateEntryInput(req.body ?? {}, leader.lobId);
  const entry = knowledgeMapRepo().create({ ...input, lastUpdatedBy: req.userId });
  await knowledgeMapRepo().save(entry);

  const full = await knowledgeMapRepo().findOne({ where: { id: entry.id }, relations: { lob: true, lastUpdatedByUser: true } });
  res.status(201).json({ entry: toView(full!) });
}

export async function updateEntry(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) throw new HttpError(400, 'Your account has no line of business set');

  const existing = await knowledgeMapRepo().findOneBy({ id: req.params.id });
  if (!existing) throw new HttpError(404, 'Knowledge map entry not found');

  const input = validateEntryInput(req.body ?? {}, leader.lobId);
  // @UpdateDateColumn's auto-timestamp only fires through the full entity
  // .save() lifecycle, not this criteria-based .update() — force it via a
  // server-side NOW() literal instead (see data-source.ts for why a client
  // `new Date()` would additionally get corrupted by local-time serialization).
  await knowledgeMapRepo().update({ id: existing.id }, { ...input, lastUpdatedBy: req.userId, lastUpdatedAt: () => 'NOW()' });

  const full = await knowledgeMapRepo().findOne({ where: { id: existing.id }, relations: { lob: true, lastUpdatedByUser: true } });
  res.json({ entry: toView(full!) });
}

export async function deleteEntry(req: Request, res: Response): Promise<void> {
  const existing = await knowledgeMapRepo().findOneBy({ id: req.params.id });
  if (!existing) throw new HttpError(404, 'Knowledge map entry not found');
  await knowledgeMapRepo().remove(existing);
  res.status(204).send();
}
