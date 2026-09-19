import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SeoTranslationEntity } from '../../../common/entities/seo-translation.entity';
import { Page } from './page.entity';

@Entity('page_translations')
@Index('uq_page_translations_page_locale', ['pageId', 'locale'], { unique: true })
export class PageTranslation extends SeoTranslationEntity {
  @Column({ type: 'uuid' })
  pageId!: string;

  @ManyToOne(() => Page, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'page_id' })
  page?: Page;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title!: string | null;
}
