import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Locale } from '../../../common/enums/locale.enum';
import { Role } from '../../../common/enums/role.enum';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { UserStatus } from '../enums/user-status.enum';

export const USER_EMAIL_UNIQUE_INDEX = 'UQ_users_email_active';
export const USER_PHONE_UNIQUE_INDEX = 'UQ_users_phone_active';

@Entity('users')
@Index(USER_EMAIL_UNIQUE_INDEX, ['email'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(USER_PHONE_UNIQUE_INDEX, ['phone'], { unique: true, where: '"deleted_at" IS NULL' })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  // Never selected by default; load it explicitly where a password must be verified
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: Role.CUSTOMER })
  role!: Role;

  @Index()
  @Column({ type: 'varchar', length: 10, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @Column({ type: 'uuid', nullable: true })
  avatarId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'avatar_id' })
  avatar?: MediaAsset | null;

  @Column({ type: 'varchar', length: 5, default: Locale.VI })
  preferredLocale!: Locale;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;
}
