export const USER_ROLES = ['new_joinee', 'mentor', 'people_leader', 'compliance_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  lobId: string | null;
}

export interface Lob {
  id: string;
  name: string;
  description: string | null;
}

export interface KnowledgeMapEntry {
  id: string;
  lobId: string;
  lobName: string | null;
  topic: string;
  description: string | null;
  ownerName: string;
  ownerEmail: string | null;
  goToContactName: string;
  goToContactEmail: string | null;
  goToContactRole: string | null;
  approverName: string | null;
  approverEmail: string | null;
  approverRole: string | null;
  notes: string | null;
  lastUpdatedByName: string | null;
  lastUpdatedAt: string;
}

export interface KnowledgeMapEntryInput {
  topic: string;
  description?: string;
  lobId?: string;
  ownerName: string;
  ownerEmail?: string;
  goToContactName: string;
  goToContactEmail?: string;
  goToContactRole?: string;
  approverName?: string;
  approverEmail?: string;
  approverRole?: string;
  notes?: string;
}

export type ChatRole = 'user' | 'assistant';
export type AnswerType = 'document' | 'knowledge_map' | 'course_tutor' | 'general';

export interface SourceDocumentMeta {
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  sectionHeader: string | null;
  pageNumber: number | null;
}

export interface KnowledgeMapMeta {
  topic: string;
  owner: string;
  goToContact: string;
  approver: string | null;
  lastUpdatedAt: string;
}

export type ChatMessageMetadata = SourceDocumentMeta | KnowledgeMapMeta | null;

export interface ChatMessageView {
  id: string;
  role: ChatRole;
  content: string;
  answerType: AnswerType | null;
  metadata: ChatMessageMetadata;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface TutorAnswer {
  content: string;
  answerType: AnswerType;
  metadata: ChatMessageMetadata;
}

export type DocumentStatus = 'uploaded' | 'processing' | 'ready' | 'failed';

export interface LobDocumentSummary {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  chunkCount: number;
  errorMessage: string | null;
  uploadedAt: string;
}

export interface DocumentChunkMetadata {
  fileName: string;
  totalChunks: number;
  sectionHeader: string | null;
  pageNumber: number | null;
}

export interface DocumentChunkView {
  id: string;
  chunkIndex: number;
  chunkText: string;
  metadata: DocumentChunkMetadata;
}

export interface DocumentDetail {
  document: LobDocumentSummary;
  chunks: DocumentChunkView[];
}

export interface RetrievedChunkResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  chunkText: string;
  chunkIndex: number;
  relevanceScore: number;
}

export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

export interface AssignedModule {
  assignmentId: string;
  moduleId: string;
  title: string;
  lobName: string | null;
  version: string;
  slaDays: number;
  assignedDate: string;
  dueDate: string;
  status: ModuleStatus;
  score: number | null;
  completedAt: string | null;
  overdue: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  contentType: 'text' | 'url';
  contentBody: string | null;
  contentUrl: string | null;
}

/** Client-facing quiz question — never carries the correct answer. */
export interface QuizQuestion {
  id: string;
  questionText: string;
  orderIndex: number;
  options: string[];
}

export interface ModuleDetail {
  module: {
    id: string;
    title: string;
    lobName: string | null;
    version: string;
    slaDays: number;
  };
  lessons: Lesson[];
  quizQuestions: QuizQuestion[];
  progress: { status: ModuleStatus; dueDate: string; startedAt: string | null } | null;
}

export interface ModuleProgress {
  status: ModuleStatus;
  score: number | null;
  completedAt: string | null;
  dueDate: string;
  overdue: boolean;
}

export interface AdminModuleSummary {
  id: string;
  title: string;
  version: string;
  slaDays: number;
  assignedCount: number;
  completedCount: number;
  completionRate: number;
}

export interface AdminModuleCompletionRow {
  employeeId: string;
  name: string;
  email: string;
  status: ModuleStatus;
  score: number | null;
  completedAt: string | null;
  dueDate: string;
  overdue: boolean;
}

export type CollaborationStatus = 'on_track' | 'overdue' | 'complete';

export interface CollaborationSession {
  sessionNumber: number;
  title: string;
  description: string;
  completedAt: string | null;
  notes: string | null;
  completedByName: string | null;
  dueDate: string | null;
}

export interface ChecklistAssignment {
  id: string;
  mentorName: string;
  menteeName: string;
  assignedDate: string;
  status: CollaborationStatus;
  sessionsCompleted: number;
  totalSessions: number;
}

export interface MyMentorAssignment {
  id: string;
  assignedDate: string;
  mentor: { id: string; name: string; role: UserRole; email: string } | null;
  sessionsCompleted: number;
  totalSessions: number;
  status: CollaborationStatus;
  nextDueDate: string | null;
}

export interface MyMenteeRow {
  assignmentId: string;
  menteeId: string;
  menteeName: string;
  menteeEmail: string;
  assignedDate: string;
  sessionsCompleted: number;
  totalSessions: number;
  status: CollaborationStatus;
  modulesCompleted: number;
  modulesAssigned: number;
}

export interface LeaderAssignmentRow {
  id: string;
  menteeName: string;
  mentorName: string;
  assignedDate: string;
  sessionsCompleted: number;
  totalSessions: number;
  status: CollaborationStatus;
}

export interface AssignableMentor {
  id: string;
  name: string;
  menteeCount: number;
}

export interface AssignableJoinee {
  id: string;
  name: string;
}

export interface DashboardSummaryData {
  totalNewJoinees: number;
  modulesCompletedThisWeek: number;
  overdueModules: number;
  mentorAssignmentsActive: number;
  sessionsCompletedThisWeek: number;
}

export type CompletionStatus = 'completed' | 'overdue' | 'in_progress' | 'not_started';

export interface CompletionRow {
  moduleAssignmentId: string;
  employeeName: string;
  moduleName: string;
  moduleVersion: string;
  assignedDate: string;
  dueDate: string;
  completionDate: string | null;
  score: number | null;
  status: CompletionStatus;
}

export interface MentorTableRow {
  assignmentId: string;
  menteeName: string;
  mentorName: string;
  assignedDate: string;
  sessionsCompleted: number;
  totalSessions: number;
  daysSinceLastSession: number;
  status: CollaborationStatus;
}

export type ReminderTargetType = 'module_assignment' | 'course_progress';

export interface OverdueItem {
  targetType: ReminderTargetType;
  targetId: string;
  employeeName: string;
  what: string;
  daysOverdue: number;
  reminderSent: boolean;
  reminderSentAt: string | null;
}

export interface DashboardModuleOption {
  id: string;
  title: string;
  version: string;
}

export interface AuditRow {
  id: string;
  employeeName: string;
  employeeEmail: string;
  lobName: string;
  moduleTitle: string;
  moduleVersion: string;
  score: number | null;
  completedAt: string;
  daysToComplete: number | null;
}

export interface AuditFilters {
  lobId?: string;
  moduleId?: string;
  from?: string;
  to?: string;
  status?: 'pass' | 'fail' | 'all';
  search?: string;
}

export interface ComplianceSummaryData {
  totalRecords: number;
  completionsThisMonth: number;
  passRate: number | null;
  modulesFullyComplete: number;
  overdueCount: number;
}

export interface IntegrityCheckResult {
  verified: boolean;
  checkedAt: string;
  triggerName: string | null;
  tableName: string | null;
}

export interface ComplianceModuleOption {
  id: string;
  title: string;
  version: string;
  lobName: string | null;
}

export interface ModuleVersionEntry {
  id: string;
  version: string;
  slaDays: number;
  isArchived: boolean;
  createdAt: string;
}

export interface ModuleVersionFamily {
  familyId: string;
  title: string;
  currentVersionId: string;
  currentVersion: string;
  versions: ModuleVersionEntry[];
}
