import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Module } from './Module';

@Entity({ name: 'module_quiz_questions' })
export class ModuleQuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId!: string;

  @ManyToOne(() => Module, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module?: Module;

  @Column({ name: 'question_text', type: 'text' })
  questionText!: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @Column({ type: 'simple-json' })
  options!: string[];

  // Never serialized to the assignee-facing API — only used server-side to
  // grade POST /api/modules/:id/completion.
  @Column({ name: 'correct_index', type: 'integer' })
  correctIndex!: number;
}
