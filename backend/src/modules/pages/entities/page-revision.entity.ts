import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Page } from './page.entity';

export interface PageRevisionSnapshot {
  page: { path: string; templateKey: string };
  translations: Record<string, Record<string, unknown>>;
  sections: {
    sectionKey: string;
    type: string;
    sortOrder: number;
    isVisible: boolean;
    isSystem: boolean;
    content: { shared: Record<string, unknown>; translations: Record<string, unknown> };
  }[];
}

// Append only: rows are never updated or deleted by the application
@Entity('page_revisions')
@Index('uq_page_revisions_page_number', ['pageId', 'revisionNumber'], { unique: true })
export class PageRevision {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  pageId!: string;

  @ManyToOne(() => Page, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'page_id' })
  page?: Page;

  @Column({ type: 'int' })
  revisionNumber!: number;

  @Column({ type: 'jsonb' })
  snapshot!: PageRevisionSnapshot;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'varchar', length: 300, nullable: true })
  note!: string | null;
}
