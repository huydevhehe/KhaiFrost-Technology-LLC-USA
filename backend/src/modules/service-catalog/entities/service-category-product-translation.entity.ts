import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ServiceCategoryProduct } from './service-category-product.entity';

@Entity('service_category_product_translations')
@Index(['productId', 'locale'], { unique: true })
export class ServiceCategoryProductTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => ServiceCategoryProduct, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: ServiceCategoryProduct;

  @Column({ type: 'varchar', length: 200, default: '' })
  name!: string;

  @Column({ type: 'varchar', length: 600, default: '' })
  description!: string;
}
