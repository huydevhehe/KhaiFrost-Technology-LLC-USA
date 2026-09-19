import { Column, Entity } from 'typeorm';
import { OrderedItemEntity } from './ordered-item.entity';

// Site-wide why-choose-us cards (home page and services overview)
@Entity('service_highlights')
export class ServiceHighlight extends OrderedItemEntity {
  @Column({ type: 'varchar', length: 32 })
  iconKey!: string;
}
