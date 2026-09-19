import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { Product } from './product.entity';

@Entity('product_images')
@Index('uq_product_images_asset', ['productId', 'mediaAssetId'], { unique: true })
export class ProductImage {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Index()
  @Column({ type: 'uuid' })
  mediaAssetId!: string;

  @ManyToOne(() => MediaAsset, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'media_asset_id' })
  mediaAsset?: MediaAsset;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
