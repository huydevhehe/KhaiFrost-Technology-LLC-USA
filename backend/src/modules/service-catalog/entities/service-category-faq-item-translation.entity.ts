import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ServiceCategoryFaqItem } from './service-category-faq-item.entity';

@Entity('service_category_faq_item_translations')
@Index(['itemId', 'locale'], { unique: true })
export class ServiceCategoryFaqItemTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => ServiceCategoryFaqItem, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item?: ServiceCategoryFaqItem;

  @Column({ type: 'varchar', length: 300, default: '' })
  question!: string;

  @Column({ type: 'varchar', length: 2000, default: '' })
  answer!: string;
}
