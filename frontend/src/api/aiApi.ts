import { httpClient, toApiError } from './httpClient';
import type { ChatMessageView, ConversationSummary, TutorAnswer } from '../types';

export async function startChat(message: string): Promise<{ conversationId: string; title: string; messages: ChatMessageView[] }> {
  try {
    const { data } = await httpClient.post('/api/ai/chat', { message });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function continueChat(conversationId: string, message: string): Promise<{ messages: ChatMessageView[] }> {
  try {
    const { data } = await httpClient.post(`/api/ai/conversations/${conversationId}/message`, { message });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  try {
    const { data } = await httpClient.get('/api/ai/conversations');
    return data.conversations;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function fetchConversation(id: string): Promise<{ conversation: ConversationSummary; messages: ChatMessageView[] }> {
  try {
    const { data } = await httpClient.get(`/api/ai/conversations/${id}`);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function askTutor(moduleId: string, stuckMessage: string, quizQuestionId?: string): Promise<TutorAnswer> {
  try {
    const { data } = await httpClient.post('/api/ai/tutor', { moduleId, quizQuestionId, stuckMessage });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}
