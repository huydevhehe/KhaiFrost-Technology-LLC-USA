import { Column, Entity, Index } from 'typeorm';
import { CategoryChildEntity } from './category-child.entity';

// Also used for the services overview page process section (categoryId null); the step number is the position
@Entity('service_category_process_steps')
@Index(['categoryId'])
export class ServiceCategoryProcessStep extends CategoryChildEntity {
  @Column({ type: 'varchar', length: 32 })
  iconKey!: string;
}
