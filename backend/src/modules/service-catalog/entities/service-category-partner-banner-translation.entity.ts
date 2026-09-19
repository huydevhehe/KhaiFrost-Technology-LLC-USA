import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ServiceCategoryPartnerBanner } from './service-category-partner-banner.entity';

@Entity('service_category_partner_banner_translations')
@Index(['bannerId', 'locale'], { unique: true })
export class ServiceCategoryPartnerBannerTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  bannerId!: string;

  @ManyToOne(() => ServiceCategoryPartnerBanner, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'banner_id' })
  banner?: ServiceCategoryPartnerBanner;

  @Column({ type: 'varchar', length: 150, default: '' })
  label!: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  heading!: string;

  @Column({ type: 'varchar', length: 1000, default: '' })
  text!: string;

  @Column({ type: 'varchar', length: 150, default: '' })
  ctaLabel!: string;
}
