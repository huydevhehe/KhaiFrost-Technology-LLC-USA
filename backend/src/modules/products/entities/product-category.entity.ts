import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { ProductCategoryTranslation } from './product-category-translation.entity';

@Entity('product_categories')
@Index('uq_product_categories_slug', ['slug'], { unique: true, where: '"deleted_at" IS NULL' })
export class ProductCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany('ProductCategoryTranslation', 'category')
  translations?: ProductCategoryTranslation[];
}
