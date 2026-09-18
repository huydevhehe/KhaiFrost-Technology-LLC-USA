import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { MediaAsset } from './media-asset.entity';

@Entity('media_asset_translations')
@Index(['mediaAssetId', 'locale'], { unique: true })
export class MediaAssetTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  mediaAssetId!: string;

  // Deleting the asset row (purge) takes its translations along; this relation is not a content usage
  @ManyToOne(() => MediaAsset, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_asset_id' })
  mediaAsset?: MediaAsset;

  @Column({ type: 'varchar', length: 300, nullable: true })
  altText!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  caption!: string | null;
}
