import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { CategoryChildEntity } from './category-child.entity';

// Quote shown on one category page; site-wide reviews live in the testimonials module
@Entity('service_category_testimonials')
@Index(['categoryId'])
export class ServiceCategoryTestimonial extends CategoryChildEntity {
  @Column({ type: 'varchar', length: 120 })
  authorName!: string;

  @Column({ type: 'uuid', nullable: true })
  avatarId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'avatar_id' })
  avatar?: MediaAsset | null;
}
