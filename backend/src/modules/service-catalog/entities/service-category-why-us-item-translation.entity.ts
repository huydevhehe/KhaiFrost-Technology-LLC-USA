import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ServiceCategoryWhyUsItem } from './service-category-why-us-item.entity';

@Entity('service_category_why_us_item_translations')
@Index(['itemId', 'locale'], { unique: true })
export class ServiceCategoryWhyUsItemTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ServiceCategoryWhyUsItem, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item?: ServiceCategoryWhyUsItem;

  @Column({ type: 'varchar', length: 200, default: '' })
  title!: string;

  @Column({ type: 'varchar', length: 400, default: '' })
  description!: string;
}
