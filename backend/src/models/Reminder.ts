import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

export const REMINDER_TARGET_TYPES = ['module_assignment', 'course_progress'] as const;
export type ReminderTargetType = (typeof REMINDER_TARGET_TYPES)[number];

/**
 * MVP "send reminder" action: no actual email/notification is dispatched,
 * this just persists that a leader clicked "Send Reminder" for a given
 * overdue module assignment or collaboration session, so the UI can show
 * "Reminder sent" instead of re-prompting on every page load.
 */
@Entity({ name: 'reminders' })
export class Reminder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 30 })
  targetType!: ReminderTargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId!: string;

  @Column({ name: 'sent_by', type: 'uuid' })
  sentBy!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sent_by' })
  sentByUser?: User;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamp' })
  sentAt!: Date;
}
