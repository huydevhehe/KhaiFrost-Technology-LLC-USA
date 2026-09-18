import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../../../src/common/entities/base.entity';
import { MediaAsset } from '../../../src/modules/media/entities/media-asset.entity';

// Stand-ins for feature entities that reference media, to prove usage discovery needs no registration
@Entity('test_articles')
export class TestArticle extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'uuid', nullable: true })
  coverId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cover_id' })
  cover?: MediaAsset | null;
}

@Entity('test_article_images')
export class TestArticleImage {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  mediaAssetId!: string;

  @ManyToOne(() => MediaAsset, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'media_asset_id' })
  mediaAsset?: MediaAsset;
}
