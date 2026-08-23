import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';
import { Module } from './Module';

/**
 * Append-only audit trail: rows are created by completeModule() and never
 * updated or deleted by the app, so a compliance export always reflects
 * what was true at the moment of completion (module_version is captured,
 * not looked up live).
 */
@Entity({ name: 'completion_records' })
export class CompletionRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee?: User;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId!: string;

  @ManyToOne(() => Module, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module?: Module;

  @Column({ name: 'module_version', type: 'varchar', length: 20 })
  moduleVersion!: string;

  @Column({ type: 'integer', nullable: true })
  score!: number | null;

  @CreateDateColumn({ name: 'completed_at', type: 'timestamp' })
  completedAt!: Date;
}
