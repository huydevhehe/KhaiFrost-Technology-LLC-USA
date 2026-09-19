import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityTarget, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Locale } from '../../../common/enums/locale.enum';
import { Role } from '../../../common/enums/role.enum';
import { Contact } from '../../contacts/entities/contact.entity';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { PageTranslation } from '../../pages/entities/page-translation.entity';
import { Page } from '../../pages/entities/page.entity';
import { PostTranslation } from '../../posts/entities/post-translation.entity';
import { Post } from '../../posts/entities/post.entity';
import { ProductTranslation } from '../../products/entities/product-translation.entity';
import { Product } from '../../products/entities/product.entity';
import { ProjectTranslation } from '../../projects/entities/project-translation.entity';
import { Project } from '../../projects/entities/project.entity';
import { ServiceCategoryTranslation } from '../../service-catalog/entities/service-category-translation.entity';
import { ServiceCategory } from '../../service-catalog/entities/service-category.entity';
import { Testimonial } from '../../testimonials/entities/testimonial.entity';
import { User } from '../../users/entities/user.entity';
import { AdminSearchType } from '../constants/search.constants';

export interface AdminSearchRow {
  id: string;
  title: string;
  subtitle: string | null;
}

interface RawSearchRow {
  id: string;
  title: string | null;
  subtitle: string | null;
}

interface TranslatedSearchOptions {
  entity: EntityTarget<ObjectLiteral>;
  translation: new () => ObjectLiteral;
  foreignProperty: string;
  textProperty: string;
  subtitle: string;
  ownMatchProperties?: string[];
  titleFallback?: string;
}

interface OwnSearchOptions {
  entity: EntityTarget<ObjectLiteral>;
  matchProperties: string[];
  title: string;
  subtitle: string;
  restrict?: (builder: SelectQueryBuilder<ObjectLiteral>) => void;
}

const STAFF_ROLES = [Role.OWNER, Role.ADMIN, Role.STAFF];
const STATUS_AND_SLUG = `item.status || ' / ' || item.slug`;

@Injectable()
export class AdminSearchRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  search(type: AdminSearchType, pattern: string, limit: number): Promise<AdminSearchRow[]> {
    switch (type) {
      case AdminSearchType.POSTS:
        return this.searchTranslated(
          {
            entity: Post,
            translation: PostTranslation,
            foreignProperty: 'postId',
            textProperty: 'title',
            subtitle: STATUS_AND_SLUG,
          },
          pattern,
          limit,
        );
      case AdminSearchType.PRODUCTS:
        return this.searchTranslated(
          {
            entity: Product,
            translation: ProductTranslation,
            foreignProperty: 'productId',
            textProperty: 'name',
            subtitle: STATUS_AND_SLUG,
          },
          pattern,
          limit,
        );
      case AdminSearchType.PROJECTS:
        return this.searchTranslated(
          {
            entity: Project,
            translation: ProjectTranslation,
            foreignProperty: 'projectId',
            textProperty: 'title',
            subtitle: STATUS_AND_SLUG,
          },
          pattern,
          limit,
        );
      case AdminSearchType.SERVICES:
        return this.searchTranslated(
          {
            entity: ServiceCategory,
            translation: ServiceCategoryTranslation,
            foreignProperty: 'categoryId',
            textProperty: 'title',
            subtitle: STATUS_AND_SLUG,
          },
          pattern,
          limit,
        );
      case AdminSearchType.PAGES:
        return this.searchTranslated(
          {
            entity: Page,
            translation: PageTranslation,
            foreignProperty: 'pageId',
            textProperty: 'title',
            subtitle: 'item.path',
            ownMatchProperties: ['path'],
            titleFallback: 'path',
          },
          pattern,
          limit,
        );
      case AdminSearchType.TESTIMONIALS:
        return this.searchOwn(
          {
            entity: Testimonial,
            matchProperties: ['authorName'],
            title: 'item.authorName',
            subtitle: 'item.company',
          },
          pattern,
          limit,
        );
      case AdminSearchType.CONTACTS:
        return this.searchOwn(
          {
            entity: Contact,
            matchProperties: ['fullName', 'email', 'subject'],
            title: 'item.fullName',
            subtitle: 'COALESCE(item.subject, item.email)',
          },
          pattern,
          limit,
        );
      case AdminSearchType.USERS:
        return this.searchOwn(
          {
            entity: User,
            matchProperties: ['fullName', 'email', 'phone'],
            title: 'item.fullName',
            subtitle: 'item.email',
            restrict: (builder) =>
              builder.andWhere('item.role IN (:...roles)', { roles: STAFF_ROLES }),
          },
          pattern,
          limit,
        );
      case AdminSearchType.CUSTOMERS:
        return this.searchOwn(
          {
            entity: User,
            matchProperties: ['fullName', 'email', 'phone'],
            title: 'item.fullName',
            subtitle: 'item.email',
            restrict: (builder) =>
              builder.andWhere('item.role = :customerRole', { customerRole: Role.CUSTOMER }),
          },
          pattern,
          limit,
        );
      case AdminSearchType.MEDIA:
        return this.searchOwn(
          {
            entity: MediaAsset,
            matchProperties: ['originalName', 'displayName'],
            title: 'COALESCE(item.displayName, item.originalName)',
            subtitle: 'item.mimeType',
          },
          pattern,
          limit,
        );
    }
  }

  // The query builder adds the soft-delete filter for the main alias, so deleted rows never match
  private async searchTranslated(
    options: TranslatedSearchOptions,
    pattern: string,
    limit: number,
  ): Promise<AdminSearchRow[]> {
    const { foreignProperty, textProperty } = options;
    const titleParts = [
      `NULLIF(btrim(viText.${textProperty}), '')`,
      `NULLIF(btrim(enText.${textProperty}), '')`,
      ...(options.titleFallback ? [`item.${options.titleFallback}`] : []),
    ];
    const rows = await this.dataSource
      .getRepository(options.entity)
      .createQueryBuilder('item')
      .leftJoin(
        options.translation,
        'viText',
        `viText.${foreignProperty} = item.id AND viText.locale = :viLocale`,
        { viLocale: Locale.VI },
      )
      .leftJoin(
        options.translation,
        'enText',
        `enText.${foreignProperty} = item.id AND enText.locale = :enLocale`,
        { enLocale: Locale.EN },
      )
      .select('item.id', 'id')
      .addSelect(`COALESCE(${titleParts.join(', ')})`, 'title')
      .addSelect(options.subtitle, 'subtitle')
      .where(
        new Brackets((qb) => {
          qb.where(`viText.${textProperty} ILIKE :pattern`, { pattern }).orWhere(
            `enText.${textProperty} ILIKE :pattern`,
          );
          for (const property of options.ownMatchProperties ?? []) {
            qb.orWhere(`item.${property} ILIKE :pattern`);
          }
        }),
      )
      .orderBy('item.updatedAt', 'DESC')
      .addOrderBy('item.id', 'ASC')
      .limit(limit)
      .getRawMany<RawSearchRow>();
    return rows.map(toRow);
  }

  private async searchOwn(
    options: OwnSearchOptions,
    pattern: string,
    limit: number,
  ): Promise<AdminSearchRow[]> {
    const builder = this.dataSource
      .getRepository(options.entity)
      .createQueryBuilder('item')
      .select('item.id', 'id')
      .addSelect(options.title, 'title')
      .addSelect(options.subtitle, 'subtitle')
      .where(
        new Brackets((qb) => {
          options.matchProperties.forEach((property, index) => {
            const condition = `item.${property} ILIKE :pattern`;
            if (index === 0) qb.where(condition, { pattern });
            else qb.orWhere(condition);
          });
        }),
      );
    options.restrict?.(builder);
    const rows = await builder
      .orderBy('item.updatedAt', 'DESC')
      .addOrderBy('item.id', 'ASC')
      .limit(limit)
      .getRawMany<RawSearchRow>();
    return rows.map(toRow);
  }
}

function toRow(row: RawSearchRow): AdminSearchRow {
  return { id: row.id, title: row.title ?? '', subtitle: row.subtitle };
}
