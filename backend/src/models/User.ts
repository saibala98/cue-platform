import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Lob } from './Lob';

export const USER_ROLES = ['new_joinee', 'mentor', 'people_leader', 'compliance_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: UserRole;

  @Column({ name: 'lob_id', type: 'uuid', nullable: true })
  lobId!: string | null;

  @ManyToOne(() => Lob, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lob_id' })
  lob?: Lob | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
