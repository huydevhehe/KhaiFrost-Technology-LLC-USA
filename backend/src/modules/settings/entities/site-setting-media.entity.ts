import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { SiteSetting } from './site-setting.entity';

// Keeps media used by a settings group discoverable and protected from deletion
@Entity('site_setting_media')
@Index('uq_site_setting_media', ['settingId', 'mediaAssetId', 'fieldKey'], { unique: true })
export class SiteSettingMedia {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  settingId!: string;

  @ManyToOne(() => SiteSetting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setting_id' })
  setting?: SiteSetting;

  @Index()
  @Column({ type: 'uuid' })
  mediaAssetId!: string;

  @ManyToOne(() => MediaAsset, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'media_asset_id' })
  mediaAsset?: MediaAsset;

  @Column({ type: 'varchar', length: 120 })
  fieldKey!: string;
}
