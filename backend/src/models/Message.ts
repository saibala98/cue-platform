import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Conversation } from './Conversation';

export const MESSAGE_ROLES = ['user', 'assistant'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const ANSWER_TYPES = ['document', 'knowledge_map', 'course_tutor', 'general'] as const;
export type AnswerType = (typeof ANSWER_TYPES)[number];

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

export type MessageMetadata = SourceDocumentMeta | KnowledgeMapMeta | null;

@Entity({ name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: Conversation;

  @Column({ type: 'varchar', length: 20 })
  role!: MessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'answer_type', type: 'varchar', length: 20, nullable: true })
  answerType!: AnswerType | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: MessageMetadata;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
