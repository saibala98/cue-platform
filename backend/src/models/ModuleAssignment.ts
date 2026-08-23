import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './User';
import { Module } from './Module';

@Entity({ name: 'module_assignments' })
@Unique(['employeeId', 'moduleId'])
export class ModuleAssignment {
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

  @CreateDateColumn({ name: 'assigned_date', type: 'timestamp' })
  assignedDate!: Date;

  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate!: Date;

  // Set the first time the assignee opens the course player; distinguishes
  // "not started" from "in progress" without a separate status column.
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt!: Date | null;
}
