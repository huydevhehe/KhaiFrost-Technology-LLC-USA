import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ServiceCategoryTestimonial } from './service-category-testimonial.entity';

@Entity('service_category_testimonial_translations')
@Index(['testimonialId', 'locale'], { unique: true })
export class ServiceCategoryTestimonialTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  testimonialId!: string;

  @ManyToOne(() => ServiceCategoryTestimonial, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'testimonial_id' })
  testimonial?: ServiceCategoryTestimonial;

  @Column({ type: 'varchar', length: 1000, default: '' })
  quote!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  authorRole!: string | null;
}
