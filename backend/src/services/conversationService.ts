import { AppDataSource } from '../database/data-source';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import type { AnswerType, MessageMetadata, MessageRole } from '../models/Message';

const conversationRepo = () => AppDataSource.getRepository(Conversation);
const messageRepo = () => AppDataSource.getRepository(Message);

const TITLE_MAX_LENGTH = 60;

export function deriveTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`;
}

export async function createConversation(userId: string, firstMessage: string): Promise<Conversation> {
  const conversation = conversationRepo().create({ userId, title: deriveTitle(firstMessage) });
  return conversationRepo().save(conversation);
}

export async function addMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  answerType: AnswerType | null = null,
  metadata: MessageMetadata = null,
): Promise<Message> {
  const message = messageRepo().create({ conversationId, role, content, answerType, metadata });
  const saved = await messageRepo().save(message);
  // A literal NOW() (not a client-supplied `new Date()`) so Postgres computes
  // it server-side — passing a JS Date as a parameter for a `timestamp`
  // (no timezone) column gets serialized in the server process's local
  // timezone by the pg driver, which silently corrupts it (see data-source.ts).
  await conversationRepo().update({ id: conversationId }, { updatedAt: () => 'NOW()' });
  return saved;
}

export async function loadOwnedConversation(conversationId: string, userId: string): Promise<Conversation | null> {
  return conversationRepo().findOne({ where: { id: conversationId, userId } });
}
