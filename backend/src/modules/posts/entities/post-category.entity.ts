import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { POST_CATEGORY_SLUG_UNIQUE_INDEX } from '../constants/post-constraints';
import { PostCategoryTranslation } from './post-category-translation.entity';

@Entity('post_categories')
@Index(POST_CATEGORY_SLUG_UNIQUE_INDEX, ['slug'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class PostCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => PostCategoryTranslation, (translation) => translation.category)
  translations?: PostCategoryTranslation[];
}
