import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { NavigationItem } from './navigation-item.entity';

@Entity('navigation_item_translations')
@Index('uq_navigation_item_translations_item_locale', ['itemId', 'locale'], { unique: true })
export class NavigationItemTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => NavigationItem, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item?: NavigationItem;

  @Column({ type: 'varchar', length: 120 })
  label!: string;
}
