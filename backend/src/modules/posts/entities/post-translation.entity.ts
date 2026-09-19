import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SeoTranslationEntity } from '../../../common/entities/seo-translation.entity';
import { POST_TRANSLATION_UNIQUE_INDEX } from '../constants/post-constraints';
import { Post } from './post.entity';

@Entity('post_translations')
@Index(POST_TRANSLATION_UNIQUE_INDEX, ['postId', 'locale'], { unique: true })
export class PostTranslation extends SeoTranslationEntity {
  @Column({ type: 'uuid' })
  postId!: string;

  @ManyToOne(() => Post, (post) => post.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post?: Post;

  @Column({ type: 'varchar', length: 255, default: '' })
  title!: string;

  @Column({ type: 'varchar', length: 600, default: '' })
  excerpt!: string;

  @Column({ type: 'text', default: '' })
  contentHtml!: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags!: string[];

  @Column({ type: 'int', default: 1 })
  readingTimeMinutes!: number;
}
