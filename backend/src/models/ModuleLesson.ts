import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Module } from './Module';

export const LESSON_CONTENT_TYPES = ['text', 'url'] as const;
export type LessonContentType = (typeof LESSON_CONTENT_TYPES)[number];

@Entity({ name: 'module_lessons' })
export class ModuleLesson {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'module_id', type: 'uuid' })
  moduleId!: string;

  @ManyToOne(() => Module, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module?: Module;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @Column({ name: 'content_type', type: 'varchar', length: 20 })
  contentType!: LessonContentType;

  @Column({ name: 'content_body', type: 'text', nullable: true })
  contentBody!: string | null;

  @Column({ name: 'content_url', type: 'varchar', length: 500, nullable: true })
  contentUrl!: string | null;
}
