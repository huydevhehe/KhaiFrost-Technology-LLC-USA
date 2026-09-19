import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ServiceCategoryProcessStep } from './service-category-process-step.entity';

@Entity('service_category_process_step_translations')
@Index(['stepId', 'locale'], { unique: true })
export class ServiceCategoryProcessStepTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  stepId!: string;

  @ManyToOne(() => ServiceCategoryProcessStep, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'step_id' })
  step?: ServiceCategoryProcessStep;

  @Column({ type: 'varchar', length: 200, default: '' })
  title!: string;

  @Column({ type: 'varchar', length: 400, default: '' })
  description!: string;
}
