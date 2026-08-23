import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Lob } from './Lob';

@Entity({ name: 'modules' })
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'lob_id', type: 'uuid', nullable: true })
  lobId!: string | null;

  @ManyToOne(() => Lob, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lob_id' })
  lob?: Lob | null;

  @Column({ name: 'content_type', type: 'varchar', length: 50 })
  contentType!: string;

  @Column({ name: 'content_body', type: 'text', nullable: true })
  contentBody!: string | null;

  @Column({ name: 'content_url', type: 'varchar', length: 500, nullable: true })
  contentUrl!: string | null;

  @Column({ type: 'varchar', length: 20, default: '2026.1' })
  version!: string;

  @Column({ name: 'order_index', type: 'integer', default: 1 })
  orderIndex!: number;

  @Column({ name: 'sla_days', type: 'integer', default: 7 })
  slaDays!: number;

  // All versions of "the same" module share a family_id (the id of whichever
  // module row was created first in the lineage). Only the non-archived
  // member of a family is the current version.
  @Column({ name: 'family_id', type: 'uuid' })
  familyId!: string;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
