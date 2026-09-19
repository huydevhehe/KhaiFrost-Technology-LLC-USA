import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { Role } from '../../../common/enums/role.enum';

// Append-only: deliberately not a BaseEntity (no soft delete, no version, never updated)
@Entity('audit_log_entries')
@Index(['entityName', 'entityId'])
export class AuditLogEntry {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'now()' })
  occurredAt!: Date;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  actorName!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  actorRole!: Role | null;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityName!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 400, nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  requestId!: string | null;

  @Column({ type: 'int', nullable: true })
  statusCode!: number | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
