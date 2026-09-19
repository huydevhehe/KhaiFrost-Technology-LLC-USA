import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { ProjectCategory } from './project-category.entity';

@Entity('project_category_translations')
@Index(['categoryId', 'locale'], { unique: true })
export class ProjectCategoryTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => ProjectCategory, (category) => category.translations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category?: ProjectCategory;

  @Column({ type: 'varchar', length: 150, default: '' })
  name!: string;
}
