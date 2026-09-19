import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ProjectSection } from './project-section.entity';

@Entity('project_section_translations')
@Index(['sectionId', 'locale'], { unique: true })
export class ProjectSectionTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  sectionId!: string;

  @ManyToOne(() => ProjectSection, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section?: ProjectSection;

  @Column({ type: 'varchar', length: 200, default: '' })
  heading!: string;

  // Sanitized before saving
  @Column({ type: 'text', default: '' })
  bodyHtml!: string;
}
