import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { Testimonial } from './testimonial.entity';

@Entity('testimonial_translations')
@Index(['testimonialId', 'locale'], { unique: true })
export class TestimonialTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  testimonialId!: string;

  @ManyToOne(() => Testimonial, (testimonial) => testimonial.translations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'testimonial_id' })
  testimonial?: Testimonial;

  @Column({ type: 'varchar', length: 1000, default: '' })
  quote!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  authorRole!: string | null;
}
