import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Locale } from '../../../common/enums/locale.enum';

export enum ContactStatus {
  NEW = 'new',
  SEEN = 'seen',
  REPLIED = 'replied',
  ARCHIVED = 'archived',
}

@Entity('contacts')
@Index(['status', 'createdAt'])
@Index(['email', 'createdAt'])
export class Contact extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  // E.164
  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  subject!: string | null;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 5, default: Locale.VI })
  locale!: Locale;

  @Column({ type: 'varchar', length: 300, nullable: true })
  sourcePage!: string | null;

  @Column({ type: 'varchar', length: 20, default: ContactStatus.NEW })
  status!: ContactStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  assignedToId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  handledAt!: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'boolean', default: false })
  isSpam!: boolean;
}
