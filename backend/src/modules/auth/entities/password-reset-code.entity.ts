import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

// The unique user index guarantees a single active code per user; requesting a new one replaces the row
@Entity('password_reset_codes')
@Index(['userId'], { unique: true })
export class PasswordResetCode {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'char', length: 64 })
  codeHash!: string;

  @Index()
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
