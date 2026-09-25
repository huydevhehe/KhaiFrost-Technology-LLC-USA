import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Page } from '../../pages/entities/page.entity';
import { NavigationLinkType } from '../constants/navigation-link-type';
import { NavigationMenu } from './navigation-menu.entity';

@Entity('navigation_items')
export class NavigationItem extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  menuId!: string;

  @ManyToOne(() => NavigationMenu, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu?: NavigationMenu;

  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null;

  @ManyToOne(() => NavigationItem, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: NavigationItem | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar', length: 20 })
  linkType!: NavigationLinkType;

  @Column({ type: 'uuid', nullable: true })
  pageId!: string | null;

  @ManyToOne(() => Page, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'page_id' })
  page?: Page | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url!: string | null;

  @Column({ type: 'boolean', default: false })
  openInNewTab!: boolean;

  @Column({ type: 'boolean', default: true })
  isVisible!: boolean;

  /** Renders as a highlighted call-to-action instead of a plain link (e.g. header "Demo" button). */
  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean;
}
