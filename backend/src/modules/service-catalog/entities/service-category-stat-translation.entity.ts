import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ServiceCategoryStat } from './service-category-stat.entity';

@Entity('service_category_stat_translations')
@Index(['statId', 'locale'], { unique: true })
export class ServiceCategoryStatTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  statId!: string;

  @ManyToOne(() => ServiceCategoryStat, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stat_id' })
  stat?: ServiceCategoryStat;

  @Column({ type: 'varchar', length: 150, default: '' })
  label!: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  description!: string;
}
