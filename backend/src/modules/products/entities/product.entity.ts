import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { DemoMode } from '../enums/demo-mode.enum';
import { ProductType } from '../enums/product-type.enum';
import { ProductCategory } from './product-category.entity';
import type { ProductImage } from './product-image.entity';
import type { ProductPrice } from './product-price.entity';
import type { ProductTranslation } from './product-translation.entity';

export type ProductSpecifications = Record<string, string | number>;

@Entity('products')
@Index('uq_products_slug', ['slug'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('uq_products_sku', ['sku'], {
  unique: true,
  where: '"deleted_at" IS NULL AND "sku" IS NOT NULL',
})
@Index('idx_products_public_listing', ['status', 'publishedAt'])
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: ProductType;

  @Column({ type: 'varchar', length: 20, default: PublicationStatus.DRAFT })
  status!: PublicationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sku!: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => ProductCategory, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: ProductCategory | null;

  @Column({ type: 'uuid', nullable: true })
  coverImageId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cover_image_id' })
  coverImage?: MediaAsset | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  demoUrl!: string | null;

  @Column({ type: 'varchar', length: 20, default: DemoMode.EXTERNAL })
  demoMode!: DemoMode;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  techStack!: string[];

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  specifications!: ProductSpecifications;

  @Column({ type: 'boolean', default: false })
  priceOnRequest!: boolean;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  authorId!: string | null;

  @OneToMany('ProductTranslation', 'product')
  translations?: ProductTranslation[];

  @OneToMany('ProductPrice', 'product')
  prices?: ProductPrice[];

  @OneToMany('ProductImage', 'product')
  images?: ProductImage[];
}
