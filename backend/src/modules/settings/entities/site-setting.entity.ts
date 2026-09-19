import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// One row per settings group; the shape of `value` is defined by the group registry
@Entity('site_settings')
@Index('uq_site_settings_group', ['group'], { unique: true, where: '"deleted_at" IS NULL' })
export class SiteSetting extends BaseEntity {
  @Column({ type: 'varchar', length: 40 })
  group!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  value!: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean;
}
