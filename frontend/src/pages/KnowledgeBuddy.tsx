import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ChatMessage from '../components/chat/ChatMessage';
import SuggestedQuestions from '../components/chat/SuggestedQuestions';
import { continueChat, fetchConversation, fetchConversations, startChat } from '../api/aiApi';
import type { ApiClientError } from '../api/httpClient';
import type { ChatMessageView, ConversationSummary } from '../types';

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-brand-border bg-brand-dark px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-pink"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function KnowledgeBuddy() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  function loadConversations() {
    return fetchConversations()
      .then(setConversations)
      .catch(() => undefined);
  }

  useEffect(() => {
    loadConversations().finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, sending]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput('');
    setSending(true);
    setError(null);

    const optimisticUser: ChatMessageView = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content: trimmed,
      answerType: null,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      if (!activeId) {
        const result = await startChat(trimmed);
        setActiveId(result.conversationId);
        setMessages(result.messages);
        void loadConversations();
      } else {
        const result = await continueChat(activeId, trimmed);
        setMessages((prev) => [...prev.filter((m) => m.id !== optimisticUser.id), ...result.messages]);
        void loadConversations();
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setError((err as ApiClientError).message);
    } finally {
      setSending(false);
    }
  }

  // "Ask Knowledge Buddy about this" from the Knowledge Map Viewer navigates
  // here with a pre-filled question in router state — auto-send it once,
  // then clear the state so refreshing this page doesn't resend it.
  useEffect(() => {
    const state = location.state as { initialQuestion?: string } | null;
    if (state?.initialQuestion) {
      void handleSend(state.initialQuestion);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  async function handleOpenConversation(id: string) {
    setActiveId(id);
    setShowMobileHistory(false);
    setError(null);
    try {
      const data = await fetchConversation(id);
      setMessages(data.messages);
    } catch (err) {
      setError((err as ApiClientError).message);
    }
  }

  function handleNewConversation() {
    setActiveId(null);
    setMessages([]);
    setShowMobileHistory(false);
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSend(input);
  }

  const historyList = (
    <div className="flex h-full flex-col">
      <button type="button" onClick={handleNewConversation} className="btn-primary w-full">
        New conversation
      </button>
      <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
        {loadingHistory ? (
          <div className="flex justify-center py-4">
            <Spinner className="h-4 w-4" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-1 text-xs text-brand-faint">No past conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void handleOpenConversation(c.id)}
              className={`w-full truncate rounded-lg px-3 py-2 text-left text-xs transition ${
                c.id === activeId ? 'bg-brand-green/10 text-brand-green' : 'text-brand-muted hover:bg-brand-surface hover:text-white'
              }`}
            >
              {c.title}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="page-bg flex h-screen flex-col overflow-hidden">
      <Nav />
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-64 shrink-0 lg:block">{historyList}</aside>

        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-brand-border bg-brand-black/40">
          <div className="flex items-center justify-between gap-3 border-b border-brand-border px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowMobileHistory(true)}
                aria-label="Show conversation history"
                className="btn-secondary px-2.5 py-1.5 text-xs lg:hidden"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              </button>
              <h1 className="h3">Knowledge Buddy</h1>
            </div>
            <button type="button" onClick={handleNewConversation} className="btn-secondary px-3 py-1.5 text-xs">
              Clear chat
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <SuggestedQuestions onSelect={(q) => void handleSend(q)} disabled={sending} />
              </div>
            ) : (
              messages.map((m) => <ChatMessage key={m.id} message={m} />)
            )}
            {sending && (
              <div className="flex justify-start">
                <ThinkingDots />
              </div>
            )}
          </div>

          {error && <p className="border-t border-brand-border px-5 py-2 text-xs text-brand-pink">{error}</p>}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-brand-border px-5 py-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your onboarding..."
              disabled={sending}
              className="input-field flex-1"
            />
            <button type="submit" disabled={sending || !input.trim()} aria-label="Send" className="btn-primary shrink-0 px-4">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 3 18 9-18 9 4-9-4-9Z" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>

        {showMobileHistory && (
          <div className="fixed inset-0 z-40 flex lg:hidden" onClick={() => setShowMobileHistory(false)}>
            <div className="absolute inset-0 bg-brand-black/80 backdrop-blur-sm" />
            <div onClick={(e) => e.stopPropagation()} className="relative z-10 h-full w-72 border-r border-brand-border bg-brand-dark p-4">
              {historyList}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
