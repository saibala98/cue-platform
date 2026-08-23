import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LobDocument } from './LobDocument';

export interface DocumentChunkMetadata {
  fileName: string;
  totalChunks: number;
  sectionHeader: string | null;
  pageNumber: number | null;
}

@Entity({ name: 'document_chunks' })
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @ManyToOne(() => LobDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document?: LobDocument;

  @Column({ name: 'lob_id', type: 'uuid' })
  lobId!: string;

  @Column({ name: 'chunk_text', type: 'text' })
  chunkText!: string;

  @Column({ name: 'chunk_index', type: 'integer' })
  chunkIndex!: number;

  @Column({ type: 'jsonb' })
  metadata!: DocumentChunkMetadata;
}
