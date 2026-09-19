import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { CategoryChildEntity } from './category-child.entity';

// At most one banner per category (unique category id)
@Entity('service_category_partner_banners')
@Index(['categoryId'], { unique: true })
export class ServiceCategoryPartnerBanner extends CategoryChildEntity {
  @Column({ type: 'uuid', nullable: true })
  imageId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'image_id' })
  image?: MediaAsset | null;

  // Site-relative path or absolute http(s) URL
  @Column({ type: 'varchar', length: 500 })
  ctaHref!: string;
}
