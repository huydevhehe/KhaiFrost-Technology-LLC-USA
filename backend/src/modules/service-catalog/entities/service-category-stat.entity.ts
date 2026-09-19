import { Column, Entity, Index } from 'typeorm';
import { CategoryChildEntity } from './category-child.entity';

// Also used for the services overview page stats strip (categoryId null)
@Entity('service_category_stats')
@Index(['categoryId'])
export class ServiceCategoryStat extends CategoryChildEntity {
  @Column({ type: 'varchar', length: 32 })
  iconKey!: string;

  @Column({ type: 'varchar', length: 40 })
  value!: string;
}
