import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('ui_translations')
@Index('uq_ui_translations_namespace_key', ['namespace', 'key'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class UiTranslation extends BaseEntity {
  @Column({ type: 'varchar', length: 60 })
  namespace!: string;

  // Dot path inside the namespace, e.g. "hero.headline"
  @Column({ type: 'varchar', length: 200 })
  key!: string;

  @Column({ type: 'text', nullable: true })
  valueVi!: string | null;

  @Column({ type: 'text', nullable: true })
  valueEn!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  // System keys are referenced by frontend code and cannot be deleted
  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;
}
