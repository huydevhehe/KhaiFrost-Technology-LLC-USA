import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { PageSection } from './page-section.entity';

// One row per media asset referenced by a section (draft or published), so usage is discoverable and deletion is blocked
@Entity('page_section_media')
@Index('uq_page_section_media', ['sectionId', 'mediaAssetId', 'fieldKey'], { unique: true })
export class PageSectionMedia {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  sectionId!: string;

  @ManyToOne(() => PageSection, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section?: PageSection;

  @Index()
  @Column({ type: 'uuid' })
  mediaAssetId!: string;

  @ManyToOne(() => MediaAsset, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'media_asset_id' })
  mediaAsset?: MediaAsset;

  // Path of the field inside the content, e.g. 'image' or 'items[].image'
  @Column({ type: 'varchar', length: 120 })
  fieldKey!: string;
}
