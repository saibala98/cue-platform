import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Lob } from './Lob';
import { User } from './User';

@Entity({ name: 'knowledge_map' })
export class KnowledgeMap {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lob_id', type: 'uuid' })
  lobId!: string;

  @ManyToOne(() => Lob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lob_id' })
  lob?: Lob;

  @Column({ type: 'varchar', length: 255 })
  topic!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'owner_name', type: 'varchar', length: 255 })
  ownerName!: string;

  @Column({ name: 'owner_email', type: 'varchar', length: 255, nullable: true })
  ownerEmail!: string | null;

  @Column({ name: 'go_to_contact_name', type: 'varchar', length: 255 })
  goToContactName!: string;

  @Column({ name: 'go_to_contact_email', type: 'varchar', length: 255, nullable: true })
  goToContactEmail!: string | null;

  @Column({ name: 'go_to_contact_role', type: 'varchar', length: 255, nullable: true })
  goToContactRole!: string | null;

  @Column({ name: 'approver_name', type: 'varchar', length: 255, nullable: true })
  approverName!: string | null;

  @Column({ name: 'approver_email', type: 'varchar', length: 255, nullable: true })
  approverEmail!: string | null;

  @Column({ name: 'approver_role', type: 'varchar', length: 255, nullable: true })
  approverRole!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'last_updated_by', type: 'uuid', nullable: true })
  lastUpdatedBy!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_updated_by' })
  lastUpdatedByUser?: User | null;

  @UpdateDateColumn({ name: 'last_updated_at', type: 'timestamp' })
  lastUpdatedAt!: Date;
}
