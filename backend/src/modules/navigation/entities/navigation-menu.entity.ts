import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('navigation_menus')
@Index('uq_navigation_menus_key', ['key'], { unique: true, where: '"deleted_at" IS NULL' })
export class NavigationMenu extends BaseEntity {
  // 'header', 'footer' or a custom kebab-case key
  @Column({ type: 'varchar', length: 60 })
  key!: string;
}
