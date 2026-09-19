import { Column, Entity, Index } from 'typeorm';
import { CategoryChildEntity } from './category-child.entity';

@Entity('service_category_why_us_items')
@Index(['categoryId'])
export class ServiceCategoryWhyUsItem extends CategoryChildEntity {
  @Column({ type: 'varchar', length: 32 })
  iconKey!: string;
}
