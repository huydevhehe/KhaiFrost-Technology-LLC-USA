import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTranslationEntity } from '../../../common/entities/base-translation.entity';
import { POST_CATEGORY_TRANSLATION_UNIQUE_INDEX } from '../constants/post-constraints';
import { PostCategory } from './post-category.entity';

@Entity('post_category_translations')
@Index(POST_CATEGORY_TRANSLATION_UNIQUE_INDEX, ['categoryId', 'locale'], { unique: true })
export class PostCategoryTranslation extends BaseTranslationEntity {
  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => PostCategory, (category) => category.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category?: PostCategory;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;
}
