import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

// One row per login. The id is stable across refresh rotations so the access token and the
// elevated admin session can stay bound to it; the refresh secret rotates in place.
@Entity('auth_sessions')
export class AuthSession {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;

  @Column({ type: 'char', length: 64 })
  refreshTokenHash!: string;

  // The secret that was valid just before the last rotation; presenting it again means it leaked
  @Column({ type: 'char', length: 64, nullable: true })
  previousRefreshTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  rotatedAt!: Date | null;

  @Column({ type: 'varchar', length: 400, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastUsedAt!: Date;

  @Index()
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  revokedReason!: string | null;

  @Column({ type: 'boolean', default: false })
  rememberMe!: boolean;

  // Elevated admin cookies issued before this moment are void
  @Column({ type: 'timestamptz', nullable: true })
  adminSessionEndedAt!: Date | null;
}
