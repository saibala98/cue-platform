import type {
  AuditRow,
  AuthUser,
  ChatMessageView,
  CollaborationStatus,
  DocumentChunkView,
  DocumentStatus,
  KnowledgeMapEntry,
  Lob,
  ModuleStatus,
  ModuleVersionFamily,
} from '../types';

function dt(date: string, time = '14:00:00'): string {
  return `${date}T${time}.000Z`;
}

export interface DemoUser extends AuthUser {
  password: string;
}

export interface DemoModuleLesson {
  id: string;
  title: string;
  orderIndex: number;
  contentType: 'text' | 'url';
  contentBody: string | null;
  contentUrl: string | null;
}

export interface DemoQuizQuestion {
  id: string;
  questionText: string;
  orderIndex: number;
  options: string[];
  correctIndex: number;
}

export interface DemoModule {
  id: string;
  title: string;
  version: string;
  slaDays: number;
  lobId: string;
  lessons: DemoModuleLesson[];
  quizQuestions: DemoQuizQuestion[];
}

export interface DemoModuleAssignment {
  id: string;
  moduleId: string;
  userId: string;
  assignedDate: string;
  dueDate: string;
  status: ModuleStatus;
  score: number | null;
  completedAt: string | null;
  startedAt: string | null;
}

export interface DemoSession {
  sessionNumber: number;
  title: string;
  description: string;
  completedAt: string | null;
  notes: string | null;
  completedByName: string | null;
  dueDate: string | null;
}

export interface DemoMentorAssignment {
  id: string;
  mentorId: string;
  menteeId: string;
  assignedDate: string;
  sessions: DemoSession[];
}

export interface DemoDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  errorMessage: string | null;
  uploadedAt: string;
  chunks: DocumentChunkView[];
}

export interface DemoConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageView[];
}

export interface DemoState {
  users: DemoUser[];
  lob: Lob;
  knowledgeMap: KnowledgeMapEntry[];
  modules: DemoModule[];
  moduleAssignments: DemoModuleAssignment[];
  mentorAssignments: DemoMentorAssignment[];
  documents: DemoDocument[];
  conversations: DemoConversation[];
  auditLog: AuditRow[];
  moduleVersionFamilies: ModuleVersionFamily[];
  reminders: Record<string, { sent: boolean; sentAt: string | null }>;
}

export const LOB: Lob = {
  id: 'lob-gic-ops',
  name: 'GIC Operations',
  description: 'Guaranteed Investment Certificate operations, servicing, and compliance.',
};

// ---- Users (4 demo logins + 3 supporting NPCs used only in seed data) ----

export const DEMO_USERS: DemoUser[] = [
  { id: 'u-alex', email: 'alex.thompson@demo.cue', password: 'demo1234', firstName: 'Alex', lastName: 'Thompson', role: 'new_joinee', lobId: LOB.id },
  { id: 'u-sarah', email: 'sarah.chen@demo.cue', password: 'demo1234', firstName: 'Sarah', lastName: 'Chen', role: 'mentor', lobId: LOB.id },
  { id: 'u-michael', email: 'michael.park@demo.cue', password: 'demo1234', firstName: 'Michael', lastName: 'Park', role: 'people_leader', lobId: LOB.id },
  { id: 'u-jennifer', email: 'jennifer.liu@demo.cue', password: 'demo1234', firstName: 'Jennifer', lastName: 'Liu', role: 'compliance_admin', lobId: LOB.id },
  { id: 'u-priya', email: 'priya.nair@demo.cue', password: 'demo1234', firstName: 'Priya', lastName: 'Nair', role: 'new_joinee', lobId: LOB.id },
  { id: 'u-daniel', email: 'daniel.osei@demo.cue', password: 'demo1234', firstName: 'Daniel', lastName: 'Osei', role: 'new_joinee', lobId: LOB.id },
  { id: 'u-maria', email: 'maria.garcia@demo.cue', password: 'demo1234', firstName: 'Maria', lastName: 'Garcia', role: 'new_joinee', lobId: LOB.id },
  { id: 'u-tom', email: 'tom.whitfield@demo.cue', password: 'demo1234', firstName: 'Tom', lastName: 'Whitfield', role: 'new_joinee', lobId: LOB.id },
  { id: 'u-james', email: 'james.whitmore@demo.cue', password: 'demo1234', firstName: 'James', lastName: 'Whitmore', role: 'mentor', lobId: LOB.id },
  { id: 'u-olivia', email: 'olivia.bennett@demo.cue', password: 'demo1234', firstName: 'Olivia', lastName: 'Bennett', role: 'mentor', lobId: LOB.id },
];

export const DEMO_LOGIN_USERS = DEMO_USERS.filter((u) =>
  ['u-alex', 'u-sarah', 'u-michael', 'u-jennifer'].includes(u.id),
);

// ---- Modules ----

export const DEMO_MODULES: DemoModule[] = [
  {
    id: 'mod-aml-kyc',
    title: 'AML/KYC Fundamentals',
    version: 'v1.0',
    slaDays: 14,
    lobId: LOB.id,
    lessons: [
      {
        id: 'lsn-aml-1',
        title: 'What is AML/KYC and why it matters',
        orderIndex: 0,
        contentType: 'text',
        contentBody:
          'Anti-Money Laundering (AML) and Know Your Customer (KYC) rules exist to stop the financial system being used to launder money or finance crime. As a GIC Operations associate, you will verify client identity at account opening, watch for unusual funding patterns on GIC purchases, and escalate anything that does not fit a client\'s known profile.\n\nEvery client relationship starts with identity verification: two pieces of ID, one of which must be government-issued photo ID, matched against the name on the GIC application.',
        contentUrl: null,
      },
      {
        id: 'lsn-aml-2',
        title: 'Red flags in GIC funding',
        orderIndex: 1,
        contentType: 'text',
        contentBody:
          'Watch for: large cash deposits immediately followed by a GIC purchase, funding from a third party with no stated relationship to the account holder, requests to split a large purchase into several GICs just under reporting thresholds, and clients who are unusually insistent about early redemption terms before the certificate is even issued.\n\nAny of these should be logged and routed to the Compliance queue before the certificate is issued — not after.',
        contentUrl: null,
      },
      {
        id: 'lsn-aml-3',
        title: 'Escalation path',
        orderIndex: 2,
        contentType: 'text',
        contentBody:
          'If you spot a red flag, do not tell the client why the transaction is delayed. Log the details in the case system and tag it to the Compliance Admin on duty. Compliance has 2 business days to review before the GIC can be issued. Never override this queue to meet a client SLA — compliance holds take priority over servicing SLAs.',
        contentUrl: null,
      },
    ],
    quizQuestions: [
      {
        id: 'qq-aml-1',
        questionText: 'A client wants to fund a $50,000 GIC with cash deposited an hour earlier by someone else. What do you do?',
        orderIndex: 0,
        options: ['Process it — GICs are low risk', 'Log it and route to Compliance before issuing', 'Ask the client to come back tomorrow', 'Refuse the client outright'],
        correctIndex: 1,
      },
      {
        id: 'qq-aml-2',
        questionText: 'How many pieces of ID are required to verify a new client, and what is the minimum standard?',
        orderIndex: 1,
        options: ['One piece, any kind', 'Two pieces, one must be government photo ID', 'Three pieces including a utility bill', 'None if the client is referred by another client'],
        correctIndex: 1,
      },
      {
        id: 'qq-aml-3',
        questionText: 'How long does Compliance have to review an escalated case before the GIC can be issued?',
        orderIndex: 2,
        options: ['No limit — wait for a response', '2 business days', '24 hours', '5 business days'],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'mod-gic-product',
    title: 'GIC Product Knowledge',
    version: 'v2.1',
    slaDays: 10,
    lobId: LOB.id,
    lessons: [
      {
        id: 'lsn-gic-1',
        title: 'GIC types and terms',
        orderIndex: 0,
        contentType: 'text',
        contentBody:
          'We offer three GIC families: Non-Redeemable (fixed term, no early access), Cashable (redeemable after 30 days with a rate adjustment), and Escalating Rate (rate steps up each year of a 5-year term). Terms range from 90 days to 5 years. Rates are published daily and locked at time of purchase, not at time of funding.',
        contentUrl: null,
      },
      {
        id: 'lsn-gic-2',
        title: 'CDIC coverage basics',
        orderIndex: 1,
        contentType: 'text',
        contentBody:
          'GICs with an original term of 5 years or less are CDIC-eligible up to $100,000 per eligible category, combined with any other eligible deposits the client holds at the institution. GICs with terms over 5 years are not eligible. Always tell clients to check their combined balance across products — CDIC coverage is not per-product.',
        contentUrl: null,
      },
    ],
    quizQuestions: [
      {
        id: 'qq-gic-1',
        questionText: 'When is a GIC rate locked in?',
        orderIndex: 0,
        options: ['At time of funding', 'At time of purchase', 'At maturity', 'It floats with prime'],
        correctIndex: 1,
      },
      {
        id: 'qq-gic-2',
        questionText: 'What is the maximum GIC term that remains CDIC-eligible?',
        orderIndex: 1,
        options: ['1 year', '3 years', '5 years', '10 years'],
        correctIndex: 2,
      },
    ],
  },
  {
    id: 'mod-compliance-cert',
    title: 'Compliance Certification Basics',
    version: 'v1.3',
    slaDays: 7,
    lobId: LOB.id,
    lessons: [
      {
        id: 'lsn-comp-1',
        title: 'Annual certification requirements',
        orderIndex: 0,
        contentType: 'text',
        contentBody:
          'Every GIC Operations associate must complete annual compliance certification covering AML/KYC, privacy handling, and complaint escalation. Certification records are retained for 7 years and are subject to regulator audit at any time.',
        contentUrl: null,
      },
      {
        id: 'lsn-comp-2',
        title: 'Handling a regulator information request',
        orderIndex: 1,
        contentType: 'text',
        contentBody:
          'If a regulator requests records directly, do not respond yourself — route the request immediately to the Compliance Admin. Do not alter, delete, or annotate any record after a request has been received; the audit log is immutable by design.',
        contentUrl: null,
      },
    ],
    quizQuestions: [
      {
        id: 'qq-comp-1',
        questionText: 'How long are compliance certification records retained?',
        orderIndex: 0,
        options: ['1 year', '3 years', '7 years', 'Indefinitely'],
        correctIndex: 2,
      },
      {
        id: 'qq-comp-2',
        questionText: 'A regulator emails you directly asking for a client\'s records. What do you do?',
        orderIndex: 1,
        options: ['Reply with the records right away', 'Ignore it', 'Route it to the Compliance Admin immediately', 'Ask your mentor for advice first'],
        correctIndex: 2,
      },
    ],
  },
];

// ---- Module assignments ----

export const DEMO_MODULE_ASSIGNMENTS: DemoModuleAssignment[] = [
  {
    id: 'ma-mod-1',
    moduleId: 'mod-aml-kyc',
    userId: 'u-alex',
    assignedDate: '2026-07-20',
    dueDate: '2026-08-03',
    status: 'completed',
    score: 92,
    completedAt: dt('2026-08-19'),
    startedAt: dt('2026-07-21'),
  },
  {
    id: 'ma-mod-2',
    moduleId: 'mod-compliance-cert',
    userId: 'u-alex',
    assignedDate: '2026-08-10',
    dueDate: '2026-08-30',
    status: 'in_progress',
    score: null,
    completedAt: null,
    startedAt: dt('2026-08-15'),
  },
  {
    id: 'ma-mod-3',
    moduleId: 'mod-aml-kyc',
    userId: 'u-priya',
    assignedDate: '2026-07-22',
    dueDate: '2026-08-05',
    status: 'completed',
    score: 88,
    completedAt: dt('2026-08-21'),
    startedAt: dt('2026-07-23'),
  },
  {
    id: 'ma-mod-4',
    moduleId: 'mod-gic-product',
    userId: 'u-priya',
    assignedDate: '2026-08-12',
    dueDate: '2026-09-05',
    status: 'in_progress',
    score: null,
    completedAt: null,
    startedAt: dt('2026-08-13'),
  },
  {
    id: 'ma-mod-5',
    moduleId: 'mod-aml-kyc',
    userId: 'u-daniel',
    assignedDate: '2026-07-15',
    dueDate: '2026-08-05',
    status: 'in_progress',
    score: null,
    completedAt: null,
    startedAt: dt('2026-07-16'),
  },
  {
    id: 'ma-mod-6',
    moduleId: 'mod-compliance-cert',
    userId: 'u-maria',
    assignedDate: '2026-08-01',
    dueDate: '2026-08-15',
    status: 'not_started',
    score: null,
    completedAt: null,
    startedAt: null,
  },
  {
    id: 'ma-mod-7',
    moduleId: 'mod-gic-product',
    userId: 'u-tom',
    assignedDate: '2026-08-18',
    dueDate: '2026-09-10',
    status: 'not_started',
    score: null,
    completedAt: null,
    startedAt: null,
  },
];

// ---- Mentor / collaboration ----

const SESSION_TEMPLATES: { title: string; description: string }[] = [
  { title: 'Welcome & Team Introductions', description: 'Meet the team, review the org chart, and walk through where to find things.' },
  { title: 'Systems & Access Walkthrough', description: 'Confirm system access is working and walk through the core operations tools.' },
  { title: 'Shadowing: Live Transaction Review', description: 'Shadow the mentor on a real GIC transaction end-to-end.' },
  { title: 'Mid-Point Check-In', description: 'Review progress against training modules and address open questions.' },
  { title: 'Independent Case Walkthrough', description: 'Mentee walks the mentor through a case they handled independently.' },
  { title: '30-Day Retrospective', description: 'Look back on the first 30 days and set goals for the next quarter.' },
];

function buildSessions(completed: { sessionNumber: number; completedAt: string; completedByName: string; notes?: string }[], nextDueDate: string | null): DemoSession[] {
  return SESSION_TEMPLATES.map((tpl, idx) => {
    const sessionNumber = idx + 1;
    const done = completed.find((c) => c.sessionNumber === sessionNumber);
    const isNext = !done && completed.every((c) => c.sessionNumber < sessionNumber) && idx === completed.length;
    return {
      sessionNumber,
      title: tpl.title,
      description: tpl.description,
      completedAt: done ? dt(done.completedAt) : null,
      notes: done?.notes ?? null,
      completedByName: done?.completedByName ?? null,
      dueDate: !done && isNext ? nextDueDate : null,
    };
  });
}

export const DEMO_MENTOR_ASSIGNMENTS: DemoMentorAssignment[] = [
  {
    id: 'ma-alex-sarah',
    mentorId: 'u-sarah',
    menteeId: 'u-alex',
    assignedDate: '2026-07-20',
    sessions: buildSessions(
      [
        { sessionNumber: 1, completedAt: '2026-08-01', completedByName: 'Sarah Chen' },
        { sessionNumber: 2, completedAt: '2026-08-10', completedByName: 'Sarah Chen' },
        { sessionNumber: 3, completedAt: '2026-08-20', completedByName: 'Sarah Chen', notes: 'Alex handled the redemption walkthrough well — comfortable with the CDIC questions.' },
      ],
      '2026-08-27',
    ),
  },
  {
    id: 'ma-priya-sarah',
    mentorId: 'u-sarah',
    menteeId: 'u-priya',
    assignedDate: '2026-07-22',
    sessions: buildSessions(
      [
        { sessionNumber: 1, completedAt: '2026-08-05', completedByName: 'Sarah Chen' },
        { sessionNumber: 2, completedAt: '2026-08-18', completedByName: 'Priya Nair' },
      ],
      '2026-08-29',
    ),
  },
  {
    id: 'ma-daniel-james',
    mentorId: 'u-james',
    menteeId: 'u-daniel',
    assignedDate: '2026-07-15',
    sessions: buildSessions(
      [{ sessionNumber: 1, completedAt: '2026-08-17', completedByName: 'James Whitmore' }],
      '2026-08-20',
    ),
  },
];

export function collaborationStatus(sessions: DemoSession[]): CollaborationStatus {
  if (sessions.every((s) => s.completedAt)) return 'complete';
  const next = sessions.find((s) => !s.completedAt);
  if (next?.dueDate && new Date(next.dueDate) < new Date('2026-08-23T23:59:59.000Z')) return 'overdue';
  return 'on_track';
}

// ---- Documents ----

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: 'doc-sop',
    fileName: 'GIC_Operations_SOP.pdf',
    fileType: 'application/pdf',
    fileSize: 482_311,
    status: 'ready',
    errorMessage: null,
    uploadedAt: dt('2026-06-02'),
    chunks: [
      {
        id: 'chunk-sop-1',
        chunkIndex: 0,
        chunkText:
          'Section 4: Rate Exceptions. A rate exception may be granted for GIC purchases over $250,000 or for long-standing clients renewing a maturing GIC within 5 business days of maturity. All rate exceptions require sign-off from a Senior Operations Lead before the certificate is issued, and must be logged in the exceptions register with the justification and the standard rate that was overridden.',
        metadata: { fileName: 'GIC_Operations_SOP.pdf', totalChunks: 3, sectionHeader: 'Section 4: Rate Exceptions', pageNumber: 12 },
      },
      {
        id: 'chunk-sop-2',
        chunkIndex: 1,
        chunkText:
          'Section 7: Early Redemption. Cashable GICs may be redeemed after 30 days with a rate adjustment applied per the current rate sheet. Non-Redeemable GICs may only be redeemed early in cases of death of the holder, or under a documented financial hardship exception approved by a VP Operations.',
        metadata: { fileName: 'GIC_Operations_SOP.pdf', totalChunks: 3, sectionHeader: 'Section 7: Early Redemption', pageNumber: 19 },
      },
      {
        id: 'chunk-sop-3',
        chunkIndex: 2,
        chunkText:
          'Section 9: Branch Codes. Branch codes are 4 digits and appear on the top-right of every client-facing GIC document. If a branch code does not resolve in the servicing system, contact the Branch Operations desk rather than guessing — an incorrect branch code can misroute certificate mail.',
        metadata: { fileName: 'GIC_Operations_SOP.pdf', totalChunks: 3, sectionHeader: 'Section 9: Branch Codes', pageNumber: 24 },
      },
    ],
  },
  {
    id: 'doc-aml-policy',
    fileName: 'AML_KYC_Policy.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 201_884,
    status: 'ready',
    errorMessage: null,
    uploadedAt: dt('2026-06-10'),
    chunks: [
      {
        id: 'chunk-aml-1',
        chunkIndex: 0,
        chunkText:
          'All new GIC accounts require identity verification consisting of two pieces of identification, at least one of which is government-issued photo ID. Funding sources that do not match the client\'s stated occupation or income profile must be logged and escalated to Compliance before the certificate is issued.',
        metadata: { fileName: 'AML_KYC_Policy.docx', totalChunks: 2, sectionHeader: 'Identity Verification', pageNumber: null },
      },
      {
        id: 'chunk-aml-2',
        chunkIndex: 1,
        chunkText:
          'Structuring — splitting a large deposit into multiple smaller GIC purchases to stay under reporting thresholds — is a reportable pattern. Any associate who observes this must file an internal escalation the same business day.',
        metadata: { fileName: 'AML_KYC_Policy.docx', totalChunks: 2, sectionHeader: 'Structuring & Reportable Patterns', pageNumber: null },
      },
    ],
  },
  {
    id: 'doc-rate-guidelines',
    fileName: 'Rate_Exception_Guidelines.pdf',
    fileType: 'application/pdf',
    fileSize: 118_022,
    status: 'processing',
    errorMessage: null,
    uploadedAt: dt('2026-08-21'),
    chunks: [],
  },
];

// ---- Knowledge Map (GIC Operations) ----

export const DEMO_KNOWLEDGE_MAP: KnowledgeMapEntry[] = [
  {
    id: 'km-1', lobId: LOB.id, lobName: LOB.name, topic: 'GIC Rate Exception Approvals',
    description: 'Who signs off on a rate exception above standard pricing.',
    ownerName: 'Sarah Chen', ownerEmail: 'sarah.chen@demo.cue',
    goToContactName: 'Sarah Chen', goToContactEmail: 'sarah.chen@demo.cue', goToContactRole: 'Senior Operations Lead',
    approverName: 'Michael Park', approverEmail: 'michael.park@demo.cue', approverRole: 'VP Operations',
    notes: 'Exceptions over $250,000 need VP sign-off in addition to the Senior Ops Lead.',
    lastUpdatedByName: 'Michael Park', lastUpdatedAt: dt('2026-08-10'),
  },
  {
    id: 'km-2', lobId: LOB.id, lobName: LOB.name, topic: 'Certificate Renewal Process',
    description: 'Steps for renewing a maturing GIC certificate.',
    ownerName: 'Olivia Bennett', ownerEmail: 'olivia.bennett@demo.cue',
    goToContactName: 'Olivia Bennett', goToContactEmail: 'olivia.bennett@demo.cue', goToContactRole: 'GIC Renewals Specialist',
    approverName: null, approverEmail: null, approverRole: null,
    notes: 'Renewal notices go out 30 days before maturity; client has a 10-day grace window after maturity at the matured rate.',
    lastUpdatedByName: 'Sarah Chen', lastUpdatedAt: dt('2026-08-05'),
  },
  {
    id: 'km-3', lobId: LOB.id, lobName: LOB.name, topic: 'Client Escalation Contact',
    description: 'Who to route an angry or high-risk client escalation to.',
    ownerName: 'Michael Park', ownerEmail: 'michael.park@demo.cue',
    goToContactName: 'Michael Park', goToContactEmail: 'michael.park@demo.cue', goToContactRole: 'People Leader, GIC Operations',
    approverName: null, approverEmail: null, approverRole: null,
    notes: 'For anything involving a regulator complaint, loop in Jennifer Liu directly.',
    lastUpdatedByName: 'Michael Park', lastUpdatedAt: dt('2026-08-12'),
  },
  {
    id: 'km-4', lobId: LOB.id, lobName: LOB.name, topic: 'Compliance Certification Questions',
    description: 'Questions about annual compliance certification requirements.',
    ownerName: 'Jennifer Liu', ownerEmail: 'jennifer.liu@demo.cue',
    goToContactName: 'Jennifer Liu', goToContactEmail: 'jennifer.liu@demo.cue', goToContactRole: 'Compliance Admin',
    approverName: null, approverEmail: null, approverRole: null,
    notes: null,
    lastUpdatedByName: 'Jennifer Liu', lastUpdatedAt: dt('2026-07-28'),
  },
  {
    id: 'km-5', lobId: LOB.id, lobName: LOB.name, topic: 'System Access Requests',
    description: 'Requesting access to the GIC servicing system or exceptions register.',
    ownerName: 'Raj Patel', ownerEmail: 'raj.patel@demo.cue',
    goToContactName: 'Raj Patel', goToContactEmail: 'raj.patel@demo.cue', goToContactRole: 'IT Service Desk Analyst',
    approverName: 'Michael Park', approverEmail: 'michael.park@demo.cue', approverRole: 'VP Operations',
    notes: 'Access requests take 1-2 business days once the People Leader approves.',
    lastUpdatedByName: 'Raj Patel', lastUpdatedAt: dt('2026-08-01'),
  },
  {
    id: 'km-6', lobId: LOB.id, lobName: LOB.name, topic: 'Branch Code Queries',
    description: 'What to do when a branch code will not resolve in the system.',
    ownerName: 'Olivia Bennett', ownerEmail: 'olivia.bennett@demo.cue',
    goToContactName: 'Branch Operations Desk', goToContactEmail: 'branchops@demo.cue', goToContactRole: 'Shared Desk',
    approverName: null, approverEmail: null, approverRole: null,
    notes: null,
    lastUpdatedByName: 'Olivia Bennett', lastUpdatedAt: dt('2026-07-15'),
  },
  {
    id: 'km-7', lobId: LOB.id, lobName: LOB.name, topic: 'Early Redemption Exceptions',
    description: 'Approving an early redemption outside the standard cashable-GIC terms.',
    ownerName: 'Sarah Chen', ownerEmail: 'sarah.chen@demo.cue',
    goToContactName: 'Sarah Chen', goToContactEmail: 'sarah.chen@demo.cue', goToContactRole: 'Senior Operations Lead',
    approverName: 'Michael Park', approverEmail: 'michael.park@demo.cue', approverRole: 'VP Operations',
    notes: 'Death-of-holder cases can be processed without VP approval; hardship cases cannot.',
    lastUpdatedByName: 'Sarah Chen', lastUpdatedAt: dt('2026-08-08'),
  },
  {
    id: 'km-8', lobId: LOB.id, lobName: LOB.name, topic: 'CDIC Coverage Questions',
    description: 'Whether a client\'s GIC is CDIC-insured and up to what amount.',
    ownerName: 'Olivia Bennett', ownerEmail: 'olivia.bennett@demo.cue',
    goToContactName: 'Olivia Bennett', goToContactEmail: 'olivia.bennett@demo.cue', goToContactRole: 'GIC Renewals Specialist',
    approverName: null, approverEmail: null, approverRole: null,
    notes: 'Terms of 5 years or less are CDIC-eligible up to $100,000, combined across all eligible deposits.',
    lastUpdatedByName: 'Olivia Bennett', lastUpdatedAt: dt('2026-07-30'),
  },
  {
    id: 'km-9', lobId: LOB.id, lobName: LOB.name, topic: 'Rate Holds Process',
    description: 'Holding a quoted rate for a client while they finalize funding.',
    ownerName: 'Sarah Chen', ownerEmail: 'sarah.chen@demo.cue',
    goToContactName: 'Sarah Chen', goToContactEmail: 'sarah.chen@demo.cue', goToContactRole: 'Senior Operations Lead',
    approverName: null, approverEmail: null, approverRole: null,
    notes: 'Rate holds are valid for 5 business days from quote date.',
    lastUpdatedByName: 'Sarah Chen', lastUpdatedAt: dt('2026-08-14'),
  },
  {
    id: 'km-10', lobId: LOB.id, lobName: LOB.name, topic: 'Special Term GIC Requests',
    description: 'Custom-term GICs outside the standard published term sheet.',
    ownerName: 'Michael Park', ownerEmail: 'michael.park@demo.cue',
    goToContactName: 'Michael Park', goToContactEmail: 'michael.park@demo.cue', goToContactRole: 'People Leader, GIC Operations',
    approverName: 'Michael Park', approverEmail: 'michael.park@demo.cue', approverRole: 'VP Operations',
    notes: null,
    lastUpdatedByName: 'Michael Park', lastUpdatedAt: dt('2026-07-22'),
  },
  {
    id: 'km-11', lobId: LOB.id, lobName: LOB.name, topic: 'Client Complaint Escalation',
    description: 'Formal complaint handling, separate from routine client escalations.',
    ownerName: 'Jennifer Liu', ownerEmail: 'jennifer.liu@demo.cue',
    goToContactName: 'Jennifer Liu', goToContactEmail: 'jennifer.liu@demo.cue', goToContactRole: 'Compliance Admin',
    approverName: null, approverEmail: null, approverRole: null,
    notes: 'Formal complaints must be acknowledged within 2 business days per regulatory requirements.',
    lastUpdatedByName: 'Jennifer Liu', lastUpdatedAt: dt('2026-08-02'),
  },
  {
    id: 'km-12', lobId: LOB.id, lobName: LOB.name, topic: 'AML/KYC Questions',
    description: 'General AML/KYC process questions from the operations floor.',
    ownerName: 'Jennifer Liu', ownerEmail: 'jennifer.liu@demo.cue',
    goToContactName: 'Jennifer Liu', goToContactEmail: 'jennifer.liu@demo.cue', goToContactRole: 'Compliance Admin',
    approverName: null, approverEmail: null, approverRole: null,
    notes: null,
    lastUpdatedByName: 'Jennifer Liu', lastUpdatedAt: dt('2026-08-18'),
  },
  {
    id: 'km-13', lobId: LOB.id, lobName: LOB.name, topic: 'Trade Confirmation Issues',
    description: 'A GIC purchase confirmation did not generate or looks wrong.',
    ownerName: 'Raj Patel', ownerEmail: 'raj.patel@demo.cue',
    goToContactName: 'Raj Patel', goToContactEmail: 'raj.patel@demo.cue', goToContactRole: 'Operations Analyst',
    approverName: null, approverEmail: null, approverRole: null,
    notes: null,
    lastUpdatedByName: 'Raj Patel', lastUpdatedAt: dt('2026-07-19'),
  },
  {
    id: 'km-14', lobId: LOB.id, lobName: LOB.name, topic: 'Day-End Balancing Contact',
    description: 'Who to contact if day-end balancing does not reconcile.',
    ownerName: 'Raj Patel', ownerEmail: 'raj.patel@demo.cue',
    goToContactName: 'Raj Patel', goToContactEmail: 'raj.patel@demo.cue', goToContactRole: 'Operations Analyst',
    approverName: 'Sarah Chen', approverEmail: 'sarah.chen@demo.cue', approverRole: 'Senior Operations Lead',
    notes: 'Do not attempt to force a balance override yourself.',
    lastUpdatedByName: 'Raj Patel', lastUpdatedAt: dt('2026-08-06'),
  },
  {
    id: 'km-15', lobId: LOB.id, lobName: LOB.name, topic: 'Regulatory Reporting Questions',
    description: 'Questions about what gets reported to the regulator and when.',
    ownerName: 'Jennifer Liu', ownerEmail: 'jennifer.liu@demo.cue',
    goToContactName: 'Jennifer Liu', goToContactEmail: 'jennifer.liu@demo.cue', goToContactRole: 'Compliance Admin',
    approverName: 'Michael Park', approverEmail: 'michael.park@demo.cue', approverRole: 'VP Operations',
    notes: null,
    lastUpdatedByName: 'Jennifer Liu', lastUpdatedAt: dt('2026-08-16'),
  },
];

// ---- Audit log (compliance admin) ----

const AUDIT_NAMES: [string, string][] = [
  ['Alex Thompson', 'alex.thompson@demo.cue'], ['Priya Nair', 'priya.nair@demo.cue'], ['Daniel Osei', 'daniel.osei@demo.cue'],
  ['Maria Garcia', 'maria.garcia@demo.cue'], ['Tom Whitfield', 'tom.whitfield@demo.cue'], ['Liam Foster', 'liam.foster@demo.cue'],
  ['Nina Petrova', 'nina.petrova@demo.cue'], ['Carlos Reyes', 'carlos.reyes@demo.cue'], ['Aisha Rahman', 'aisha.rahman@demo.cue'],
  ['Ethan Wu', 'ethan.wu@demo.cue'],
];
const AUDIT_MODULES: [string, string][] = [
  ['AML/KYC Fundamentals', 'v1.0'], ['GIC Product Knowledge', 'v2.1'], ['Compliance Certification Basics', 'v1.3'], ['GIC Product Knowledge', 'v2.0'],
];

export const DEMO_AUDIT_LOG: AuditRow[] = Array.from({ length: 20 }).map((_, i) => {
  const [employeeName, employeeEmail] = AUDIT_NAMES[i % AUDIT_NAMES.length];
  const [moduleTitle, moduleVersion] = AUDIT_MODULES[i % AUDIT_MODULES.length];
  const day = 2 + (i % 26);
  const daysToComplete = 3 + (i % 11);
  const score = 68 + ((i * 7) % 33);
  return {
    id: `audit-${i + 1}`,
    employeeName: `${employeeName} ${i >= AUDIT_NAMES.length ? 'II' : ''}`.trim(),
    employeeEmail,
    lobName: LOB.name,
    moduleTitle,
    moduleVersion,
    score,
    completedAt: dt(`2026-08-${String(day).padStart(2, '0')}`),
    daysToComplete,
  };
});

// ---- Module version families (compliance) ----

export const DEMO_MODULE_VERSION_FAMILIES: ModuleVersionFamily[] = [
  {
    familyId: 'fam-aml-kyc',
    title: 'AML/KYC Fundamentals',
    currentVersionId: 'mod-aml-kyc',
    currentVersion: 'v1.0',
    versions: [{ id: 'mod-aml-kyc', version: 'v1.0', slaDays: 14, isArchived: false, createdAt: dt('2026-06-01') }],
  },
  {
    familyId: 'fam-gic-product',
    title: 'GIC Product Knowledge',
    currentVersionId: 'mod-gic-product',
    currentVersion: 'v2.1',
    versions: [
      { id: 'mod-gic-product-v2.0', version: 'v2.0', slaDays: 10, isArchived: true, createdAt: dt('2026-03-10') },
      { id: 'mod-gic-product', version: 'v2.1', slaDays: 10, isArchived: false, createdAt: dt('2026-07-01') },
    ],
  },
  {
    familyId: 'fam-compliance-cert',
    title: 'Compliance Certification Basics',
    currentVersionId: 'mod-compliance-cert',
    currentVersion: 'v1.3',
    versions: [{ id: 'mod-compliance-cert', version: 'v1.3', slaDays: 7, isArchived: false, createdAt: dt('2026-05-20') }],
  },
];

export function seedState(): DemoState {
  return {
    users: DEMO_USERS,
    lob: LOB,
    knowledgeMap: DEMO_KNOWLEDGE_MAP,
    modules: DEMO_MODULES,
    moduleAssignments: DEMO_MODULE_ASSIGNMENTS,
    mentorAssignments: DEMO_MENTOR_ASSIGNMENTS,
    documents: DEMO_DOCUMENTS,
    conversations: [],
    auditLog: DEMO_AUDIT_LOG,
    moduleVersionFamilies: DEMO_MODULE_VERSION_FAMILIES,
    reminders: {},
  };
}
