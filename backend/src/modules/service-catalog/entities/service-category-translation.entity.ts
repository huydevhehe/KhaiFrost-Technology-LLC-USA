import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SeoTranslationEntity } from '../../../common/entities/seo-translation.entity';
import { ServiceCategory } from './service-category.entity';

@Entity('service_category_translations')
@Index(['categoryId', 'locale'], { unique: true })
export class ServiceCategoryTranslation extends SeoTranslationEntity {
  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => ServiceCategory, (category) => category.translations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category?: ServiceCategory;

  // Card / list title
  @Column({ type: 'varchar', length: 200, default: '' })
  title!: string;

  // Short name used in breadcrumbs and generic headings
  @Column({ type: 'varchar', length: 200, default: '' })
  categoryName!: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  summary!: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  heroTitle!: string;

  @Column({ type: 'varchar', length: 1000, default: '' })
  heroSubtitle!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  productsEyebrow!: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  productsHeading!: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  productsIntro!: string | null;
}
