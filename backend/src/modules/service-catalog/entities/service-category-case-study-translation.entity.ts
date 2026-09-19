import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ServiceCategoryCaseStudy } from './service-category-case-study.entity';

@Entity('service_category_case_study_translations')
@Index(['caseStudyId', 'locale'], { unique: true })
export class ServiceCategoryCaseStudyTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  caseStudyId!: string;

  @ManyToOne(() => ServiceCategoryCaseStudy, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'case_study_id' })
  caseStudy?: ServiceCategoryCaseStudy;

  @Column({ type: 'varchar', length: 200, default: '' })
  name!: string;

  @Column({ type: 'varchar', length: 600, default: '' })
  description!: string;
}
