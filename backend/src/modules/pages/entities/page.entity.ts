import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PageStatus } from '../constants/page-status';

@Entity('pages')
@Index('uq_pages_path', ['path'], { unique: true, where: '"deleted_at" IS NULL' })
export class Page extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  path!: string;

  // Selects the frontend layout, e.g. 'home', 'about', 'generic'
  @Column({ type: 'varchar', length: 60 })
  templateKey!: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: PageStatus.DRAFT })
  status!: PageStatus;

  // System pages back fixed routes: they cannot be deleted or moved
  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  currentRevisionNumber!: number;
}
