import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ProductCategory } from './product-category.entity';

@Entity('product_category_translations')
@Index('uq_product_category_translations_locale', ['categoryId', 'locale'], { unique: true })
export class ProductCategoryTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => ProductCategory, (category) => category.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category?: ProductCategory;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;
}
