import { Column, JoinColumn, ManyToOne } from 'typeorm';
import type { MediaAsset } from '../../modules/media/entities/media-asset.entity';
import { BaseTranslationEntity } from './base-translation.entity';

// Extend this (instead of BaseTranslationEntity) for any per-locale row that needs its own SEO metadata
export abstract class SeoTranslationEntity extends BaseTranslationEntity {
  @Column({ type: 'varchar', length: 120, nullable: true })
  seoTitle!: string | null;

  @Column({ type: 'varchar', length: 320, nullable: true })
  seoDescription!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  seoKeywords!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  canonicalUrl!: string | null;

  @Column({ type: 'boolean', default: false })
  noIndex!: boolean;

  @Column({ type: 'uuid', nullable: true })
  ogImageId!: string | null;

  // String target keeps common/ free of a runtime import from a feature module
  @ManyToOne('MediaAsset', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'og_image_id' })
  ogImage?: MediaAsset | null;
}
