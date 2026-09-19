import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Page } from './page.entity';

export interface SectionContent {
  shared: Record<string, unknown>;
  translations: { vi?: Record<string, unknown>; en?: Record<string, unknown> };
}

export function emptySectionContent(): SectionContent {
  return { shared: {}, translations: {} };
}

@Entity('page_sections')
@Index('uq_page_sections_page_key', ['pageId', 'sectionKey'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class PageSection extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  pageId!: string;

  @ManyToOne(() => Page, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'page_id' })
  page?: Page;

  // Stable identifier such as 'hero'; the frontend and seeds refer to it
  @Column({ type: 'varchar', length: 80 })
  sectionKey!: string;

  @Column({ type: 'varchar', length: 60 })
  type!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isVisible!: boolean;

  // System sections cannot be deleted, only hidden
  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'jsonb', default: () => `'{"shared":{},"translations":{}}'::jsonb` })
  draftContent!: SectionContent;

  // Null until the first publish; the public site only ever reads this
  @Column({ type: 'jsonb', nullable: true })
  publishedContent!: SectionContent | null;
}
