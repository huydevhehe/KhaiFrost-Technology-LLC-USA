import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PROJECT_CATEGORY_SLUG_UNIQUE_INDEX } from '../constants/project.constants';
import { ProjectCategoryTranslation } from './project-category-translation.entity';

@Entity('project_categories')
@Index(PROJECT_CATEGORY_SLUG_UNIQUE_INDEX, ['slug'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class ProjectCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @OneToMany(() => ProjectCategoryTranslation, (translation) => translation.category)
  translations?: ProjectCategoryTranslation[];
}
