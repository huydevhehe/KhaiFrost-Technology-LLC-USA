import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SeoTranslationEntity } from '../../../common/entities/seo-translation.entity';
import { Project } from './project.entity';

@Entity('project_translations')
@Index(['projectId', 'locale'], { unique: true })
export class ProjectTranslation extends SeoTranslationEntity {
  @Column({ type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, (project) => project.translations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ type: 'varchar', length: 200, default: '' })
  title!: string;

  @Column({ type: 'varchar', length: 600, default: '' })
  summary!: string;

  // Sanitized before saving
  @Column({ type: 'text', default: '' })
  descriptionHtml!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  industry!: string | null;
}
