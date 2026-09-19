import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { SERVICE_SLUG_UNIQUE_INDEX } from '../constants/service-catalog.constants';
import { ServiceCategoryTranslation } from './service-category-translation.entity';

@Entity('service_categories')
@Index(SERVICE_SLUG_UNIQUE_INDEX, ['slug'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['status', 'sortOrder'])
export class ServiceCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'varchar', length: 20, default: PublicationStatus.DRAFT })
  status!: PublicationStatus;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar', length: 32 })
  iconKey!: string;

  @Column({ type: 'uuid', nullable: true })
  coverImageId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cover_image_id' })
  coverImage?: MediaAsset | null;

  @Column({ type: 'uuid', nullable: true })
  heroImageId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hero_image_id' })
  heroImage?: MediaAsset | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @OneToMany(() => ServiceCategoryTranslation, (translation) => translation.category)
  translations?: ServiceCategoryTranslation[];
}
