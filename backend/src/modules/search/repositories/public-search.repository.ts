import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { Locale } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { PostTranslation } from '../../posts/entities/post-translation.entity';
import { Post } from '../../posts/entities/post.entity';
import { ProductTranslation } from '../../products/entities/product-translation.entity';
import { Product } from '../../products/entities/product.entity';
import { ProjectTranslation } from '../../projects/entities/project-translation.entity';
import { Project } from '../../projects/entities/project.entity';
import { ServiceCategoryTranslation } from '../../service-catalog/entities/service-category-translation.entity';
import { ServiceCategory } from '../../service-catalog/entities/service-category.entity';
import { PublicSearchType } from '../constants/search.constants';

export interface PublicSearchRow {
  title: string;
  excerpt: string;
  slug: string;
}

interface PublishedSearchOptions {
  entity: EntityTarget<ObjectLiteral>;
  translation: new () => ObjectLiteral;
  foreignProperty: string;
  titleProperty: string;
  excerptProperty: string;
  // Scheduled (future) publication dates stay hidden for content that has a publication date
  requiresPublicationDate: boolean;
  orderProperty: string;
  orderDirection: 'ASC' | 'DESC';
}

const DEFINITIONS: Record<PublicSearchType, PublishedSearchOptions> = {
  [PublicSearchType.POST]: {
    entity: Post,
    translation: PostTranslation,
    foreignProperty: 'postId',
    titleProperty: 'title',
    excerptProperty: 'excerpt',
    requiresPublicationDate: true,
    orderProperty: 'publishedAt',
    orderDirection: 'DESC',
  },
  [PublicSearchType.PRODUCT]: {
    entity: Product,
    translation: ProductTranslation,
    foreignProperty: 'productId',
    titleProperty: 'name',
    excerptProperty: 'tagline',
    requiresPublicationDate: true,
    orderProperty: 'publishedAt',
    orderDirection: 'DESC',
  },
  [PublicSearchType.PROJECT]: {
    entity: Project,
    translation: ProjectTranslation,
    foreignProperty: 'projectId',
    titleProperty: 'title',
    excerptProperty: 'summary',
    requiresPublicationDate: false,
    orderProperty: 'sortOrder',
    orderDirection: 'ASC',
  },
  [PublicSearchType.SERVICE]: {
    entity: ServiceCategory,
    translation: ServiceCategoryTranslation,
    foreignProperty: 'categoryId',
    titleProperty: 'title',
    excerptProperty: 'summary',
    requiresPublicationDate: false,
    orderProperty: 'sortOrder',
    orderDirection: 'ASC',
  },
};

@Injectable()
export class PublicSearchRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async search(
    type: PublicSearchType,
    pattern: string,
    locale: Locale,
    limit: number,
  ): Promise<PublicSearchRow[]> {
    const definition = DEFINITIONS[type];
    const builder = this.dataSource
      .getRepository(definition.entity)
      .createQueryBuilder('item')
      .innerJoin(
        definition.translation,
        'localized',
        `localized.${definition.foreignProperty} = item.id AND localized.locale = :locale`,
        { locale },
      )
      .select(`localized.${definition.titleProperty}`, 'title')
      .addSelect(`COALESCE(localized.${definition.excerptProperty}, '')`, 'excerpt')
      .addSelect('item.slug', 'slug')
      .where('item.status = :published', { published: PublicationStatus.PUBLISHED })
      .andWhere(
        new Brackets((qb) => {
          qb.where(`localized.${definition.titleProperty} ILIKE :pattern`, { pattern }).orWhere(
            `localized.${definition.excerptProperty} ILIKE :pattern`,
          );
        }),
      );
    if (definition.requiresPublicationDate) {
      builder.andWhere('item.publishedAt IS NOT NULL AND item.publishedAt <= now()');
    }
    return builder
      .orderBy(`item.${definition.orderProperty}`, definition.orderDirection)
      .addOrderBy('item.id', 'ASC')
      .limit(limit)
      .getRawMany<PublicSearchRow>();
  }
}
