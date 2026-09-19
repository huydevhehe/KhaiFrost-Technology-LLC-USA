import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

export interface LocalizedText {
  vi: string;
  en: string;
}

// Short-lived inbox row: deliberately not a BaseEntity (no soft delete, purged by retention)
@Entity('notifications')
@Index('idx_notifications_inbox', ['recipientId', 'readAt', 'createdAt'])
export class Notification {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  recipientId!: string;

  @Column({ type: 'varchar', length: 60 })
  type!: string;

  @Column({ type: 'jsonb' })
  title!: LocalizedText;

  @Column({ type: 'jsonb' })
  body!: LocalizedText;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityName!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
