import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SeoTranslationEntity } from '../../../common/entities/seo-translation.entity';
import { Product } from './product.entity';

@Entity('product_translations')
@Index('uq_product_translations_locale', ['productId', 'locale'], { unique: true })
export class ProductTranslation extends SeoTranslationEntity {
  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  tagline!: string | null;

  @Column({ type: 'text', nullable: true })
  descriptionHtml!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  features!: string[];
}
