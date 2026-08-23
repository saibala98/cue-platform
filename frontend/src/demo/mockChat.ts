import type { AnswerType, ChatMessageMetadata } from '../types';
import { DEMO_DOCUMENTS, DEMO_KNOWLEDGE_MAP } from './mockData';

interface DemoQA {
  triggers: string;
  content: string;
  answerType: AnswerType;
  metadata: ChatMessageMetadata;
}

function kmMeta(topic: string): ChatMessageMetadata {
  const entry = DEMO_KNOWLEDGE_MAP.find((e) => e.topic === topic);
  if (!entry) return null;
  return {
    topic: entry.topic,
    owner: entry.ownerName,
    goToContact: entry.goToContactRole ? `${entry.goToContactName}, ${entry.goToContactRole}` : entry.goToContactName,
    approver: entry.approverName ? (entry.approverRole ? `${entry.approverName}, ${entry.approverRole}` : entry.approverName) : null,
    lastUpdatedAt: entry.lastUpdatedAt,
  };
}

function docMeta(docId: string, chunkId: string): ChatMessageMetadata {
  const doc = DEMO_DOCUMENTS.find((d) => d.id === docId);
  const chunk = doc?.chunks.find((c) => c.id === chunkId);
  if (!doc || !chunk) return null;
  return {
    fileName: doc.fileName,
    chunkIndex: chunk.chunkIndex,
    totalChunks: chunk.metadata.totalChunks,
    sectionHeader: chunk.metadata.sectionHeader,
    pageNumber: chunk.metadata.pageNumber,
  };
}

export const DEMO_QA: DemoQA[] = [
  {
    triggers: 'gic rate exception process rate exceptions approve exception pricing',
    content:
      'Per Section 4 of the GIC Operations SOP: a rate exception may be granted for GIC purchases over $250,000, or for long-standing clients renewing a maturing GIC within 5 business days of maturity. All rate exceptions require sign-off from a Senior Operations Lead before the certificate is issued, and must be logged in the exceptions register with a justification and the standard rate that was overridden.',
    answerType: 'document',
    metadata: docMeta('doc-sop', 'chunk-sop-1'),
  },
  {
    triggers: 'who approves rate exceptions rate exception approval approver',
    content: 'For rate exceptions, Sarah Chen (Senior Operations Lead) is your go-to contact and first approver. Exceptions over $250,000 also need sign-off from Michael Park (VP Operations).',
    answerType: 'knowledge_map',
    metadata: kmMeta('GIC Rate Exception Approvals'),
  },
  {
    triggers: "i'm stuck stuck question 3 aml module help me understand quiz question",
    content:
      'Happy to help you work through it rather than just giving the answer. Re-read the escalation guidance: red flags in GIC funding should be logged and routed to Compliance *before* the certificate is issued — never processed first and explained later, and never told to the client directly. Look at your answer choices again with that rule in mind — which one keeps the transaction on hold rather than moving it forward?',
    answerType: 'course_tutor',
    metadata: null,
  },
  {
    triggers: 'certificate renewal process renew renewing gic maturing renewal notice',
    content:
      'Renewal notices go out automatically 30 days before a GIC matures. The client has a 10-day grace window after maturity where they can still renew at the matured rate before it rolls to a demand savings rate. Olivia Bennett (GIC Renewals Specialist) owns this process end-to-end.',
    answerType: 'knowledge_map',
    metadata: kmMeta('Certificate Renewal Process'),
  },
  {
    triggers: 'client escalation angry client complaint who do i contact upset',
    content: 'Route client escalations to Michael Park (People Leader, GIC Operations). If it involves a regulator complaint, loop in Jennifer Liu (Compliance Admin) directly rather than waiting.',
    answerType: 'knowledge_map',
    metadata: kmMeta('Client Escalation Contact'),
  },
  {
    triggers: 'compliance certification annual certification requirements how long retained',
    content: 'Annual compliance certification covers AML/KYC, privacy handling, and complaint escalation. Records are retained for 7 years and are subject to regulator audit at any time. Jennifer Liu (Compliance Admin) owns this process.',
    answerType: 'document',
    metadata: docMeta('doc-sop', 'chunk-sop-1'),
  },
  {
    triggers: 'system access request access to servicing system exceptions register locked out',
    content: 'System access requests go to Raj Patel on the IT Service Desk. Once your People Leader (Michael Park) approves the request, access is usually granted within 1-2 business days.',
    answerType: 'knowledge_map',
    metadata: kmMeta('System Access Requests'),
  },
  {
    triggers: 'branch code branch codes do not resolve wrong branch',
    content: "Branch codes are 4 digits and appear top-right on every client-facing GIC document. If a code won't resolve in the servicing system, contact the Branch Operations Desk directly rather than guessing — an incorrect branch code can misroute certificate mail.",
    answerType: 'document',
    metadata: docMeta('doc-sop', 'chunk-sop-3'),
  },
  {
    triggers: 'early redemption exception redeem early cash out before maturity hardship',
    content:
      'Cashable GICs can be redeemed after 30 days with a rate adjustment applied per the current rate sheet. Non-Redeemable GICs can only be redeemed early for death of the holder, or a documented financial hardship exception — and hardship cases need VP Operations sign-off, death cases do not.',
    answerType: 'document',
    metadata: docMeta('doc-sop', 'chunk-sop-2'),
  },
  {
    triggers: 'cdic coverage insured how much is covered deposit insurance',
    content: 'GICs with an original term of 5 years or less are CDIC-eligible up to $100,000 per eligible category, combined with any other eligible deposits the client holds with us — coverage is not per-product. Terms over 5 years are not CDIC-eligible.',
    answerType: 'knowledge_map',
    metadata: kmMeta('CDIC Coverage Questions'),
  },
  {
    triggers: 'rate hold hold a rate quote how long is a rate held',
    content: 'Rate holds are valid for 5 business days from the quote date. Sarah Chen (Senior Operations Lead) is the go-to contact if a client needs more time than that.',
    answerType: 'knowledge_map',
    metadata: kmMeta('Rate Holds Process'),
  },
  {
    triggers: 'special term gic custom term outside standard term sheet',
    content: 'Special/custom-term GIC requests go through Michael Park, who also needs VP Operations sign-off before it can be quoted to the client.',
    answerType: 'knowledge_map',
    metadata: kmMeta('Special Term GIC Requests'),
  },
  {
    triggers: 'complaint escalation formal complaint how fast must we respond',
    content: 'Formal complaints (distinct from a routine escalation) must be acknowledged within 2 business days per regulatory requirement. Jennifer Liu (Compliance Admin) owns formal complaint handling.',
    answerType: 'knowledge_map',
    metadata: kmMeta('Client Complaint Escalation'),
  },
  {
    triggers: 'aml kyc questions know your customer identity verification id required',
    content: "New GIC accounts require two pieces of identification, at least one government-issued photo ID. If the funding source doesn't match the client's stated occupation or income profile, log it and escalate to Compliance before the certificate is issued.",
    answerType: 'document',
    metadata: docMeta('doc-aml-policy', 'chunk-aml-1'),
  },
  {
    triggers: 'structuring splitting deposits reporting threshold',
    content: 'Structuring — splitting a large deposit into multiple smaller GIC purchases to stay under reporting thresholds — is a reportable pattern. If you spot it, file an internal escalation the same business day.',
    answerType: 'document',
    metadata: docMeta('doc-aml-policy', 'chunk-aml-2'),
  },
  {
    triggers: 'trade confirmation issue confirmation did not generate missing confirmation',
    content: "If a GIC purchase confirmation didn't generate or looks wrong, contact Raj Patel (Operations Analyst) — don't manually recreate the confirmation yourself.",
    answerType: 'knowledge_map',
    metadata: kmMeta('Trade Confirmation Issues'),
  },
  {
    triggers: 'day end balancing does not reconcile balancing contact',
    content: 'If day-end balancing does not reconcile, contact Raj Patel (Operations Analyst) — do not attempt a manual balance override. If it is not resolved same-day, Sarah Chen (Senior Operations Lead) is the approver for next steps.',
    answerType: 'knowledge_map',
    metadata: kmMeta('Day-End Balancing Contact'),
  },
  {
    triggers: 'regulatory reporting what gets reported to the regulator',
    content: 'Jennifer Liu (Compliance Admin) owns regulatory reporting questions; anything that would actually be filed also needs Michael Park (VP Operations) sign-off before it goes out.',
    answerType: 'knowledge_map',
    metadata: kmMeta('Regulatory Reporting Questions'),
  },
  {
    triggers: 'regulator request records directly what do i do',
    content: "Never respond to a regulator directly yourself. Route the request immediately to the Compliance Admin, and don't alter, delete, or annotate any record after the request has been received — the audit log is immutable by design.",
    answerType: 'document',
    metadata: docMeta('doc-sop', 'chunk-sop-1'),
  },
  {
    triggers: 'gic types term rate lock non-redeemable cashable escalating',
    content: 'We offer three GIC families: Non-Redeemable (fixed term, no early access), Cashable (redeemable after 30 days with a rate adjustment), and Escalating Rate (rate steps up each year of a 5-year term). Rates are locked at time of purchase, not at time of funding.',
    answerType: 'document',
    metadata: docMeta('doc-sop', 'chunk-sop-1'),
  },
];

function score(question: string, haystack: string): number {
  const words = question.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const text = haystack.toLowerCase();
  let total = 0;
  for (const w of words) {
    if (w.length < 3) continue;
    if (text.includes(w)) total += 1;
  }
  return total;
}

export function matchDemoAnswer(question: string): { content: string; answerType: AnswerType; metadata: ChatMessageMetadata } {
  let best: DemoQA | null = null;
  let bestScore = 0;
  for (const qa of DEMO_QA) {
    const s = score(question, qa.triggers);
    if (s > bestScore) {
      bestScore = s;
      best = qa;
    }
  }
  if (best && bestScore >= 2) {
    return { content: best.content, answerType: best.answerType, metadata: best.metadata };
  }
  return {
    content:
      "I don't have a specific match for that in the GIC Operations knowledge base yet. Try asking about rate exceptions, certificate renewals, CDIC coverage, AML/KYC, or who to contact for a specific process — or check the Knowledge Map for the full topic list.",
    answerType: 'general',
    metadata: null,
  };
}

export function matchDemoTutorAnswer(stuckMessage: string): { content: string; answerType: AnswerType; metadata: ChatMessageMetadata } {
  const generic =
    "Let's break it down rather than jumping to the answer. Re-read the question and the lesson section it came from, and think about which choice best matches the rule stated there — not just what sounds reasonable. If you're still stuck after that, flag it to your mentor with the specific line you're unsure about.";
  const best = matchDemoAnswer(stuckMessage);
  if (best.answerType !== 'general') {
    return { content: best.content, answerType: 'course_tutor', metadata: null };
  }
  return { content: generic, answerType: 'course_tutor', metadata: null };
}
