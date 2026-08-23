/**
 * MOCK AI SERVICE — no LLM call happens here. Every response is built from
 * real data (document chunks via retrievalService, real knowledge_map rows,
 * real module/lesson content) run through keyword matching and templates.
 *
 * ── When ready to connect the real Claude API ──────────────────────────
 * Replace the body of `answerGeneralQuestion` / `answerTutorQuestion` with a
 * call to Claude, keeping the same return shape ({ content, answerType,
 * metadata }) so callers (ai.controller.ts) don't need to change. The
 * retrieved chunks / knowledge-map rows below become the context you pass
 * to Claude instead of the answer itself — this mock's job (classify the
 * question, fetch grounding data) is exactly the retrieval step a real
 * RAG pipeline still needs; only the generation step changes.
 *
 *   import Anthropic from '@anthropic-ai/sdk';
 *   const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
 *
 *   const response = await client.messages.create({
 *     model: 'claude-sonnet-5', // fast/cheap tier fits short Q&A + tutoring;
 *                               // use 'claude-opus-5' if answer quality needs
 *                               // to go up
 *     max_tokens: 1024,
 *     system: systemPrompt, // build from the retrieved chunks/knowledge-map rows
 *     messages: [{ role: 'user', content: userQuestion }],
 *   });
 *   const text = response.content.find((b) => b.type === 'text')?.text ?? '';
 *
 * (Uses the official `@anthropic-ai/sdk` package, not raw fetch — the SDK
 * handles retries, typed errors, and response parsing for you.)
 * ────────────────────────────────────────────────────────────────────────
 */
import { AppDataSource } from '../database/data-source';
import { KnowledgeMap } from '../models/KnowledgeMap';
import { LobDocument } from '../models/LobDocument';
import { ModuleLesson } from '../models/ModuleLesson';
import { searchChunks } from './retrievalService';
import type { AnswerType, KnowledgeMapMeta, MessageMetadata, SourceDocumentMeta } from '../models/Message';

const knowledgeMapRepo = () => AppDataSource.getRepository(KnowledgeMap);
const documentRepo = () => AppDataSource.getRepository(LobDocument);
const lessonRepo = () => AppDataSource.getRepository(ModuleLesson);

export interface MockAnswer {
  content: string;
  answerType: AnswerType;
  metadata: MessageMetadata;
}

const PERSON_LOOKUP_TRIGGERS = ['who', 'contact', 'approve', 'approval', 'approver', 'reach out', 'go-to', 'go to', 'ask'];
const DOCUMENT_LIST_TRIGGERS = ['what documents', 'which documents', 'documents should i read', 'what should i read'];

// Common short words that would otherwise pollute relevance scoring —
// notably via false-positive substring matches ("is" inside "list").
const STOPWORDS = new Set(['a', 'an', 'the', 'is', 'are', 'my', 'who', 'what', 'do', 'does', 'to', 'of', 'for', 'and', 'or', 'in', 'on', 'i']);

function extractTerms(text: string, dropStopwords = false): string[] {
  const terms = (text.match(/[\p{L}\p{N}']+/gu) ?? []).map((t) => t.toLowerCase());
  return dropStopwords ? terms.filter((t) => !STOPWORDS.has(t)) : terms;
}

/** Whole-word overlap count — substring matching would let short terms like
 * "is" spuriously match inside unrelated words (e.g. "list"). */
function scoreOverlap(terms: string[], haystack: string): number {
  const haystackWords = new Set((haystack.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []));
  return terms.reduce((count, term) => (haystackWords.has(term) ? count + 1 : count), 0);
}

async function tryDocumentList(lobId: string, question: string): Promise<MockAnswer | null> {
  const lower = question.toLowerCase();
  if (!DOCUMENT_LIST_TRIGGERS.some((trigger) => lower.includes(trigger))) return null;

  const docs = await documentRepo().find({ where: { lobId, status: 'ready' }, order: { uploadedAt: 'ASC' } });
  if (docs.length === 0) {
    return {
      content: "There aren't any documents uploaded for your LOB yet — check back once your people leader has added some, or ask me something else in the meantime.",
      answerType: 'general',
      metadata: null,
    };
  }

  const list = docs.map((d) => `• ${d.fileName}`).join('\n');
  return {
    content: `Here's what's available for your LOB so far:\n\n${list}\n\nAsk me anything about what's in them and I'll pull the relevant section.`,
    answerType: 'general',
    metadata: null,
  };
}

// Answer Type 2 (knowledge map). This is the retrieval half of RAG for
// tribal knowledge — same role as tryDocumentSearch above, just against
// knowledge_map instead of document_chunks. This integrates with Claude API
// in MVP2: the matched row(s) below become grounding context handed to
// Claude instead of being templated into the answer directly, the same way
// the architecture note at the top of this file describes for documents.
async function tryKnowledgeMap(lobId: string, question: string): Promise<MockAnswer | null> {
  const lower = question.toLowerCase();
  if (!PERSON_LOOKUP_TRIGGERS.some((trigger) => lower.includes(trigger))) return null;

  const terms = extractTerms(question, true);
  const entries = await knowledgeMapRepo().find({ where: { lobId } });
  if (entries.length === 0) return null;

  const scored = entries
    .map((entry) => ({
      entry,
      score: scoreOverlap(terms, `${entry.topic} ${entry.description ?? ''} ${entry.ownerName} ${entry.goToContactName} ${entry.approverName ?? ''}`),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  const best = scored[0].entry;

  const metadata: KnowledgeMapMeta = {
    topic: best.topic,
    owner: best.ownerName,
    goToContact: best.goToContactRole ? `${best.goToContactName}, ${best.goToContactRole}` : best.goToContactName,
    approver: best.approverName ? (best.approverRole ? `${best.approverName}, ${best.approverRole}` : best.approverName) : null,
    lastUpdatedAt: best.lastUpdatedAt.toISOString(),
  };

  // content is a short lead-in — the structured card renders from metadata
  // on the frontend, so the fields aren't duplicated as plain text here.
  return { content: `Found this in the knowledge map for "${best.topic}":`, answerType: 'knowledge_map', metadata };
}

async function tryDocumentSearch(lobId: string, question: string): Promise<MockAnswer | null> {
  const results = await searchChunks(lobId, question, 1);
  if (results.length === 0) return null;

  const top = results[0];
  const chunkPreview = top.chunkText.length > 500 ? `${top.chunkText.slice(0, 500)}…` : top.chunkText;

  const metadata: SourceDocumentMeta = {
    fileName: top.documentName,
    chunkIndex: top.chunkIndex,
    totalChunks: top.chunkMetadata.totalChunks,
    sectionHeader: top.chunkMetadata.sectionHeader,
    pageNumber: top.chunkMetadata.pageNumber,
  };

  // content is just the excerpt — the source citation renders from metadata
  // on the frontend, so it isn't duplicated as plain text here.
  return { content: chunkPreview, answerType: 'document', metadata };
}

/**
 * Platform/process FAQ — how onboarding *works*, not LOB content. Checked
 * before the DB-grounded lookups below since none of this lives in a
 * document or the knowledge map; it's about the product itself.
 */
const PLATFORM_FAQ: { triggers: string[]; response: string }[] = [
  {
    triggers: ['hi', 'hello', 'hey'],
    response:
      "Hi! I'm your Knowledge Buddy. I can answer questions from your LOB's documents, look up who to contact or who approves something from the knowledge map, or help if you're stuck on a training quiz. What do you need?",
  },
  {
    triggers: ['who are you', 'what can you do', 'what do you do'],
    response:
      "I ground my answers in three places: your LOB's uploaded documents (policies, SOPs), the knowledge map (who to contact or who approves what), and your current training module if you're stuck on a quiz. Ask me anything from those and I'll cite where the answer came from.",
  },
  {
    triggers: ['how long does onboarding take', 'how long is onboarding', 'how long will onboarding take'],
    response:
      "It depends on your assigned modules' SLAs and your mentor checklist's pace — check the Training page for each module's due date, and My Mentor for your 6-session collaboration timeline.",
  },
  {
    triggers: ['how do i mark a module complete', 'how do i complete a module', 'how do i finish a module'],
    response:
      'Open the module from your Training page, work through each lesson, then take the short quiz at the end. Submitting the quiz marks the module complete and records your score.',
  },
  {
    triggers: ['retake the quiz', 'retake a quiz', 'can i retake'],
    response:
      "Yes — reopening a module and resubmitting the quiz records a new completion. Your full history is kept, so nothing gets lost if you want to improve a score.",
  },
  {
    triggers: ['how often do i meet my mentor', 'when do i meet my mentor', 'how many sessions with my mentor'],
    response:
      'Your collaboration checklist has 6 sessions with your mentor. Either of you can mark a session complete once it happens — there\'s no fixed schedule, but sessions are expected roughly every 7 days to stay on track.',
  },
  {
    triggers: ['missed a deadline', 'past due', 'what happens if i miss', "what if i'm overdue", 'what if i am overdue'],
    response:
      "If a module or mentor session goes past its due date it shows as overdue on your dashboard and your people leader's — it's not a penalty, just a nudge. Jump back in when you can, or reach out to your mentor if something's blocking you.",
  },
  {
    triggers: ['is my progress tracked', 'who can see my progress', 'who sees my scores'],
    response:
      'Your people leader can see your training completion and mentor checklist progress on their dashboard. Compliance admins can see your completion records too, since those are the audit trail for regulatory training.',
  },
  {
    triggers: ['how do i contact my mentor', 'how do i reach my mentor', "who is my mentor"],
    response: "Check the \"My Mentor\" page in the nav — it shows your mentor's name, role, and email, plus your shared collaboration checklist.",
  },
  {
    triggers: ["i'm stuck on a module", 'i am stuck on a module', 'stuck on a quiz', 'need help with a quiz'],
    response:
      'While you\'re in a module quiz, look for the "Ask Knowledge Buddy" button — it gives me the actual lesson content as context so I can nudge you toward the answer without just giving it away.',
  },
  {
    triggers: ['how do i download a document', 'where are the documents', 'how do i find a document'],
    response: 'Check the Document Manager (if your people leader has given you access) or ask me directly — I\'ll search your LOB\'s documents and quote the relevant part.',
  },
  {
    triggers: ["what's my due date", 'when is my training due', 'what is my due date'],
    response: "Each module's due date is on your Training page next to its status badge — I don't have a live view of your personal deadlines from here, but that page always has the exact date.",
  },
  {
    triggers: ['what is a knowledge map', "what's the knowledge map"],
    response:
      "The knowledge map is your LOB's directory of tribal knowledge — who owns a process, who's the go-to contact, and who has final approval. Ask me \"who approves X\" or \"who do I contact for Y\" and I'll look it up.",
  },
  {
    triggers: ['how do i see my score', 'where can i see my score', 'what was my score'],
    response: 'Your Training page shows the score for every module you\'ve completed, right next to its completion date.',
  },
  {
    triggers: ['thank you', 'thanks'],
    response: "You're welcome — let me know if anything else comes up.",
  },
  {
    triggers: ['bye', 'goodbye', 'see you'],
    response: 'Good luck with onboarding! Come back anytime you have a question.',
  },
];

function tryPlatformFaq(question: string): MockAnswer | null {
  const lower = question.toLowerCase().trim();
  const match = PLATFORM_FAQ.find((entry) => entry.triggers.some((trigger) => lower.includes(trigger)));
  return match ? { content: match.response, answerType: 'general', metadata: null } : null;
}

function fallbackAnswer(): MockAnswer {
  return {
    content:
      "I don't have grounded information for that yet. Try asking about your onboarding documents, who to contact for a specific process, or a question from your current training module — I'll search your LOB's actual documents and knowledge map before answering.",
    answerType: 'general',
    metadata: null,
  };
}

export async function answerGeneralQuestion(lobId: string, question: string): Promise<MockAnswer> {
  // Simulates real "thinking" latency so the UI's loading state isn't instant.
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

  return (
    tryPlatformFaq(question) ??
    (await tryDocumentList(lobId, question)) ??
    (await tryKnowledgeMap(lobId, question)) ??
    (await tryDocumentSearch(lobId, question)) ??
    fallbackAnswer()
  );
}

export interface TutorContext {
  moduleId: string;
  moduleTitle: string;
  quizQuestionText: string;
  quizOptions: string[];
  stuckMessage: string;
}

export async function answerTutorQuestion(ctx: TutorContext): Promise<MockAnswer> {
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

  const lessons = await lessonRepo().find({ where: { moduleId: ctx.moduleId }, order: { orderIndex: 'ASC' } });
  const terms = extractTerms(`${ctx.quizQuestionText} ${ctx.stuckMessage}`, true);

  const best = lessons
    .map((lesson) => ({ lesson, score: scoreOverlap(terms, `${lesson.title} ${lesson.contentBody ?? ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.lesson;

  if (!best) {
    return {
      content: `I don't have lesson content to point you to for "${ctx.moduleTitle}" yet, but re-read the question carefully and rule out the options that clearly don't fit — you've got this.`,
      answerType: 'course_tutor',
      metadata: null,
    };
  }

  const hintSnippet = (best.contentBody ?? '').split(/(?<=[.!?])\s+/)[0] ?? best.title;

  return {
    content: `Take another look at the lesson "${best.title}" — it covers exactly this. Specifically: ${hintSnippet}\n\nThink about how that applies to the question, and see which option it rules out first. I won't give you the answer directly, but that lesson has what you need.`,
    answerType: 'course_tutor',
    metadata: null,
  };
}
