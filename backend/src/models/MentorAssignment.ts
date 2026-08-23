import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

@Entity({ name: 'mentor_assignments' })
export class MentorAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'leader_id', type: 'uuid' })
  leaderId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leader_id' })
  leader?: User;

  @Column({ name: 'mentor_id', type: 'uuid' })
  mentorId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentor_id' })
  mentor?: User;

  @Column({ name: 'mentee_id', type: 'uuid' })
  menteeId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentee_id' })
  mentee?: User;

  @CreateDateColumn({ name: 'assigned_date', type: 'timestamp' })
  assignedDate!: Date;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}
