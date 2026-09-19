import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { TestimonialTranslation } from './testimonial-translation.entity';

export enum TestimonialStatus {
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

@Entity('testimonials')
@Index(['status', 'sortOrder'])
export class Testimonial extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  authorName!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  company!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  location!: string | null;

  @Column({ type: 'smallint', default: 5 })
  rating!: number;

  @Column({ type: 'varchar', length: 20, default: TestimonialStatus.HIDDEN })
  status!: TestimonialStatus;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'uuid', nullable: true })
  avatarId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'avatar_id' })
  avatar?: MediaAsset | null;

  @OneToMany(() => TestimonialTranslation, (translation) => translation.testimonial)
  translations?: TestimonialTranslation[];
}
