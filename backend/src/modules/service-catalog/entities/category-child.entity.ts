import { Column, JoinColumn, ManyToOne } from 'typeorm';
import { OrderedItemEntity } from './ordered-item.entity';
import { ServiceCategory } from './service-category.entity';

// A null category means the item belongs to the services overview page itself
export abstract class CategoryChildEntity extends OrderedItemEntity {
  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => ServiceCategory, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category?: ServiceCategory | null;
}
