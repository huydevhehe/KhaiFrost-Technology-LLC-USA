import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { POST_SLUG_UNIQUE_INDEX } from '../constants/post-constraints';
import { PostCategory } from './post-category.entity';
import { PostTranslation } from './post-translation.entity';

@Entity('posts')
@Index(POST_SLUG_UNIQUE_INDEX, ['slug'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['status', 'publishedAt'])
export class Post extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  @Column({ type: 'varchar', length: 20, default: PublicationStatus.DRAFT })
  status!: PublicationStatus;

  // A future value on a published post means "scheduled": hidden from the public API until then
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => PostCategory, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: PostCategory | null;

  @Column({ type: 'uuid', nullable: true })
  coverImageId!: string | null;

  @ManyToOne(() => MediaAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cover_image_id' })
  coverImage?: MediaAsset | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  authorId!: string | null;

  @Column({ type: 'varchar', length: 150 })
  authorName!: string;

  @OneToMany(() => PostTranslation, (translation) => translation.post)
  translations?: PostTranslation[];
}
