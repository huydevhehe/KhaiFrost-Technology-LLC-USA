import { Column, Entity, JoinColumn, ManyToOne, Index } from 'typeorm';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { ServiceProductLinkType } from '../constants/service-product-link-type';
import { CategoryChildEntity } from './category-child.entity';

@Entity('service_category_products')
@Index(['categoryId'])
export class ServiceCategoryProduct extends CategoryChildEntity {
  @Column({ type: 'uuid', nullable: true })
  imageId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'image_id' })
  image?: MediaAsset | null;

  // Any video link (YouTube, Vimeo, direct file...). Duration is read from it, never typed by hand.
  @Column({ type: 'text', nullable: true })
  videoUrl!: string | null;

  @Column({ type: 'int', nullable: true })
  videoDurationSeconds!: number | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags!: string[];

  @Column({ type: 'varchar', length: 20, default: ServiceProductLinkType.NONE })
  linkType!: ServiceProductLinkType;

  // No ORM relation on purpose: the FK exists at the DB level (see migration), but declaring
  // it here would pull the whole Products/Posts entity graph into every module that loads this
  // entity. ProductLinkResolverService queries Product/Post directly by id instead.
  @Column({ type: 'uuid', nullable: true })
  linkProductId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  linkPostId!: string | null;

  @Column({ type: 'text', nullable: true })
  linkExternalUrl!: string | null;
}
