import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Module } from '../models/Module';
import { ModuleAssignment } from '../models/ModuleAssignment';
import { ModuleQuizQuestion } from '../models/ModuleQuizQuestion';
import { addMessage, createConversation, loadOwnedConversation } from '../services/conversationService';
import { answerGeneralQuestion, answerTutorQuestion } from '../services/mockKnowledgeBuddy';
import { HttpError } from '../middleware/errorHandler';

const userRepo = () => AppDataSource.getRepository(User);
const conversationRepo = () => AppDataSource.getRepository(Conversation);
const messageRepo = () => AppDataSource.getRepository(Message);
const moduleRepo = () => AppDataSource.getRepository(Module);
const moduleAssignmentRepo = () => AppDataSource.getRepository(ModuleAssignment);
const quizRepo = () => AppDataSource.getRepository(ModuleQuizQuestion);

function toMessageView(m: Message) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    answerType: m.answerType,
    metadata: m.metadata,
    createdAt: m.createdAt,
  };
}

async function requireUserLob(req: Request): Promise<User> {
  const user = await userRepo().findOneBy({ id: req.userId });
  if (!user?.lobId) throw new HttpError(400, 'Your account has no line of business set');
  return user;
}

function validateMessageBody(req: Request): string {
  const { message } = req.body ?? {};
  if (typeof message !== 'string' || !message.trim()) throw new HttpError(400, 'message is required');
  return message.trim();
}

export async function startChat(req: Request, res: Response): Promise<void> {
  const user = await requireUserLob(req);
  const question = validateMessageBody(req);

  const conversation = await createConversation(user.id, question);
  const userMessage = await addMessage(conversation.id, 'user', question);
  const answer = await answerGeneralQuestion(user.lobId as string, question);
  const assistantMessage = await addMessage(conversation.id, 'assistant', answer.content, answer.answerType, answer.metadata);

  res.status(201).json({
    conversationId: conversation.id,
    title: conversation.title,
    messages: [toMessageView(userMessage), toMessageView(assistantMessage)],
  });
}

export async function continueChat(req: Request, res: Response): Promise<void> {
  const user = await requireUserLob(req);
  const conversation = await loadOwnedConversation(req.params.id, user.id);
  if (!conversation) throw new HttpError(404, 'Conversation not found');

  const question = validateMessageBody(req);
  const userMessage = await addMessage(conversation.id, 'user', question);
  const answer = await answerGeneralQuestion(user.lobId as string, question);
  const assistantMessage = await addMessage(conversation.id, 'assistant', answer.content, answer.answerType, answer.metadata);

  res.status(201).json({ messages: [toMessageView(userMessage), toMessageView(assistantMessage)] });
}

export async function listConversations(req: Request, res: Response): Promise<void> {
  const conversations = await conversationRepo().find({ where: { userId: req.userId }, order: { updatedAt: 'DESC' } });
  res.json({
    conversations: conversations.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt })),
  });
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const conversation = await loadOwnedConversation(req.params.id, req.userId as string);
  if (!conversation) throw new HttpError(404, 'Conversation not found');

  const messages = await messageRepo().find({ where: { conversationId: conversation.id }, order: { createdAt: 'ASC' } });
  res.json({
    conversation: { id: conversation.id, title: conversation.title, createdAt: conversation.createdAt },
    messages: messages.map(toMessageView),
  });
}

export async function tutor(req: Request, res: Response): Promise<void> {
  const { moduleId, quizQuestionId, stuckMessage } = req.body ?? {};
  if (typeof moduleId !== 'string') throw new HttpError(400, 'moduleId is required');
  if (typeof stuckMessage !== 'string' || !stuckMessage.trim()) throw new HttpError(400, 'stuckMessage is required');

  const assignment = await moduleAssignmentRepo().findOne({ where: { employeeId: req.userId, moduleId } });
  if (!assignment) throw new HttpError(403, 'This module is not assigned to you');

  const module = await moduleRepo().findOneBy({ id: moduleId });
  if (!module) throw new HttpError(404, 'Module not found');

  let quizQuestionText = stuckMessage.trim();
  let quizOptions: string[] = [];
  if (typeof quizQuestionId === 'string') {
    const question = await quizRepo().findOneBy({ id: quizQuestionId, moduleId });
    if (question) {
      quizQuestionText = question.questionText;
      quizOptions = question.options;
    }
  }

  const answer = await answerTutorQuestion({
    moduleId,
    moduleTitle: module.title,
    quizQuestionText,
    quizOptions,
    stuckMessage: stuckMessage.trim(),
  });

  res.json({ content: answer.content, answerType: answer.answerType, metadata: answer.metadata });
}
