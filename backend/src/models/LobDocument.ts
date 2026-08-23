import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Lob } from './Lob';
import { User } from './User';

export const DOCUMENT_STATUSES = ['uploaded', 'processing', 'ready', 'failed'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

@Entity({ name: 'lob_documents' })
export class LobDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lob_id', type: 'uuid' })
  lobId!: string;

  @ManyToOne(() => Lob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lob_id' })
  lob?: Lob;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath!: string;

  @Column({ name: 'file_type', type: 'varchar', length: 20 })
  fileType!: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize!: number;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser?: User;

  @Column({ type: 'varchar', length: 20, default: 'uploaded' })
  status!: DocumentStatus;

  @Column({ name: 'chunk_count', type: 'integer', default: 0 })
  chunkCount!: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamp' })
  uploadedAt!: Date;
}
