import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { PROJECT_SLUG_UNIQUE_INDEX } from '../constants/project.constants';
import { ProjectCategory } from './project-category.entity';
import { ProjectTranslation } from './project-translation.entity';

@Entity('projects')
@Index(PROJECT_SLUG_UNIQUE_INDEX, ['slug'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['status', 'sortOrder'])
export class Project extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'varchar', length: 20, default: PublicationStatus.DRAFT })
  status!: PublicationStatus;

  @Column({ type: 'boolean', default: false })
  featured!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => ProjectCategory, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: ProjectCategory | null;

  @Column({ type: 'uuid', nullable: true })
  thumbnailId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'thumbnail_id' })
  thumbnail?: MediaAsset | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  clientName!: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  technologies!: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  demoUrl!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl!: string | null;

  @Column({ type: 'boolean', default: false })
  hasVideo!: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true })
  videoDuration!: string | null;

  // YYYY-MM-DD
  @Column({ type: 'date', nullable: true })
  completedAt!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @OneToMany(() => ProjectTranslation, (translation) => translation.project)
  translations?: ProjectTranslation[];
}
