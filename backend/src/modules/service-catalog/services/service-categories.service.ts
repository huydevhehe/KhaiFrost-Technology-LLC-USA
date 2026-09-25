import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { ErrorCode } from '../../../common/constants/error-codes';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import {
  conflict,
  notFound,
  translationMissing,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { generateUniqueSlug } from '../../../common/utils/unique-slug';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import {
  INVALID_STATUS_TRANSITION,
  RESERVED_SERVICE_SLUGS,
  SERVICE_SLUG_UNIQUE_INDEX,
} from '../constants/service-catalog.constants';
import {
  ListServiceCategoriesQueryDto,
  SERVICE_CATEGORY_SORT_FIELDS,
} from '../dto/list-service-categories-query.dto';
import {
  CreateServiceCategoryDto,
  ServiceCategoryContentDto,
  ServiceCategoryTranslationsDto,
  UpdateServiceCategoryDto,
} from '../dto/service-category-input.dto';
import { ProductInputDto } from '../dto/service-collection-input.dto';
import {
  ServiceCategoryDetailResponseDto,
  ServiceCategoryListItemResponseDto,
} from '../dto/service-response.dto';
import { ServiceCategory } from '../entities/service-category.entity';
import { ServiceCategoryTranslation } from '../entities/service-category-translation.entity';
import {
  ServiceCategoryAggregate,
  toAdminCategoryDetail,
  toAdminListItem,
} from '../mappers/service-category.mapper';
import { CategoryCollectionsService, MissingTranslation } from './category-collections.service';
import { CollectionItemInput } from './collection-definition';
import { CATEGORY_COLLECTION_KEYS, CATEGORY_COLLECTIONS } from './collection-definitions';
import { ProductLinkResolverService } from './product-link-resolver.service';
import { ServiceCategoryAggregateLoader } from './service-category-aggregate-loader.service';

const REQUIRED_TEXT_FIELDS = [
  'title',
  'categoryName',
  'summary',
  'heroTitle',
  'heroSubtitle',
] as const;
const OPTIONAL_TEXT_FIELDS = ['productsEyebrow', 'productsHeading', 'productsIntro'] as const;
const SEO_TEXT_FIELDS = ['seoTitle', 'seoDescription', 'seoKeywords', 'canonicalUrl'] as const;

const STATUS_TRANSITIONS: Record<PublicationStatus, PublicationStatus[]> = {
  [PublicationStatus.DRAFT]: [PublicationStatus.PUBLISHED, PublicationStatus.ARCHIVED],
  [PublicationStatus.IN_REVIEW]: [],
  [PublicationStatus.PUBLISHED]: [PublicationStatus.DRAFT, PublicationStatus.ARCHIVED],
  [PublicationStatus.ARCHIVED]: [PublicationStatus.DRAFT],
};

type CollectionPayload = Record<string, CollectionItemInput[] | undefined>;

@Injectable()
export class ServiceCategoriesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ServiceCategory) private readonly categories: Repository<ServiceCategory>,
    private readonly collections: CategoryCollectionsService,
    private readonly loader: ServiceCategoryAggregateLoader,
    private readonly media: MediaReferenceService,
    private readonly productLinks: ProductLinkResolverService,
  ) {}

  async list(
    query: ListServiceCategoriesQueryDto,
  ): Promise<PaginatedResponseDto<ServiceCategoryListItemResponseDto>> {
    const builder = this.categories.createQueryBuilder('category');
    if (query.status) builder.andWhere('category.status = :status', { status: query.status });
    if (query.search) {
      const pattern = containsPattern(query.search);
      builder.andWhere(
        new Brackets((qb) =>
          qb.where('category.slug ILIKE :pattern', { pattern }).orWhere(
            `EXISTS (SELECT 1 FROM service_category_translations translation
                WHERE translation.category_id = category.id
                AND (translation.title ILIKE :pattern OR translation.category_name ILIKE :pattern))`,
            { pattern },
          ),
        ),
      );
    }
    const sort = resolveSort(query, SERVICE_CATEGORY_SORT_FIELDS, 'sortOrder');
    builder.orderBy(`category.${sort.field}`, sort.order).addOrderBy('category.createdAt', 'ASC');

    const page = await paginate(builder, query);
    const translations = page.items.length
      ? await this.dataSource.getRepository(ServiceCategoryTranslation).find({
          where: { categoryId: In(page.items.map((category) => category.id)) },
        })
      : [];
    const urls = await this.media.resolveUrls(
      page.items.flatMap((category) => (category.coverImageId ? [category.coverImageId] : [])),
    );
    const items = page.items.map((category) =>
      toAdminListItem(
        category,
        translations.filter((row) => row.categoryId === category.id),
        urls,
      ),
    );
    return new PaginatedResponseDto(items, page.meta);
  }

  async getById(id: string): Promise<ServiceCategoryDetailResponseDto> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw notFound('Service');
    return this.toDetail(this.dataSource.manager, category);
  }

  async create(dto: CreateServiceCategoryDto): Promise<ServiceCategoryDetailResponseDto> {
    const viTitle = dto.translations?.vi?.title?.trim();
    if (!viTitle) {
      throw validationFailed([
        {
          field: 'translations.vi.title',
          messages: ['A Vietnamese title is required to create a service'],
        },
      ]);
    }
    if (dto.slug && RESERVED_SERVICE_SLUGS.includes(dto.slug)) {
      throw validationFailed([{ field: 'slug', messages: ['This slug is reserved'] }]);
    }
    await this.assertMediaExist(dto);
    await this.assertProductLinksExist(dto);

    const id = await this.insertWithUniqueSlug(dto, viTitle);
    return this.getById(id);
  }

  async update(
    id: string,
    dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryDetailResponseDto> {
    if (dto.slug && RESERVED_SERVICE_SLUGS.includes(dto.slug)) {
      throw validationFailed([{ field: 'slug', messages: ['This slug is reserved'] }]);
    }
    await this.assertMediaExist(dto);
    await this.assertProductLinksExist(dto);
    try {
      await this.dataSource.transaction(async (manager) => {
        const category = await this.lockOrFail(manager, id);
        assertVersionMatches(category.version, dto.version);

        if (dto.slug !== undefined) category.slug = dto.slug;
        if (dto.iconKey !== undefined) category.iconKey = dto.iconKey;
        if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
        if (dto.coverImageId !== undefined) category.coverImageId = dto.coverImageId ?? null;
        if (dto.heroImageId !== undefined) category.heroImageId = dto.heroImageId ?? null;
        // Forces the UPDATE (and version bump) even when only the child blocks changed
        category.updatedAt = new Date();
        await manager.save(category);

        await this.upsertTranslations(manager, category.id, dto.translations);
        await this.applyCollections(manager, category.id, dto);

        if (category.status === PublicationStatus.PUBLISHED) {
          this.assertPublishable(await this.loader.load(manager, category));
        }
      });
    } catch (error) {
      if (isUniqueViolation(error, SERVICE_SLUG_UNIQUE_INDEX)) {
        throw conflict(ErrorCode.CONFLICT, 'This slug is already in use');
      }
      throw error;
    }
    return this.getById(id);
  }

  publish(id: string): Promise<ServiceCategoryDetailResponseDto> {
    return this.transition(id, PublicationStatus.PUBLISHED);
  }

  unpublish(id: string): Promise<ServiceCategoryDetailResponseDto> {
    return this.transition(id, PublicationStatus.DRAFT);
  }

  archive(id: string): Promise<ServiceCategoryDetailResponseDto> {
    return this.transition(id, PublicationStatus.ARCHIVED);
  }

  // The given ids come first in the given order; every other service keeps its relative order after them
  async reorder(ids: string[]): Promise<string[]> {
    return this.dataSource.transaction(async (manager) => {
      const all = await manager.find(ServiceCategory, {
        select: { id: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
      const known = new Set(all.map((category) => category.id));
      const unknown = ids.filter((id) => !known.has(id));
      if (unknown.length > 0) {
        throw validationFailed([
          { field: 'ids', messages: [`Unknown service ids: ${unknown.join(', ')}`] },
        ]);
      }
      const requested = new Set(ids);
      const ordered = [...ids, ...all.map((c) => c.id).filter((id) => !requested.has(id))];
      for (const [index, id] of ordered.entries()) {
        await manager.update(ServiceCategory, { id }, { sortOrder: index });
      }
      return ordered;
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.categories.softDelete({ id, deletedAt: IsNull() });
    if (!result.affected) throw notFound('Service');
  }

  private async transition(
    id: string,
    target: PublicationStatus,
  ): Promise<ServiceCategoryDetailResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const category = await this.lockOrFail(manager, id);
      if (!STATUS_TRANSITIONS[category.status].includes(target)) {
        throw conflict(
          INVALID_STATUS_TRANSITION,
          `A ${category.status} service cannot become ${target}`,
        );
      }
      if (target === PublicationStatus.PUBLISHED) {
        this.assertPublishable(await this.loader.load(manager, category));
        category.publishedAt = category.publishedAt ?? new Date();
      }
      if (target === PublicationStatus.DRAFT) category.publishedAt = null;
      category.status = target;
      await manager.save(category);
    });
    return this.getById(id);
  }

  private async lockOrFail(manager: EntityManager, id: string): Promise<ServiceCategory> {
    const category = await manager.findOne(ServiceCategory, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!category) throw notFound('Service');
    return category;
  }

  private async toDetail(
    manager: EntityManager,
    category: ServiceCategory,
  ): Promise<ServiceCategoryDetailResponseDto> {
    const aggregate = await this.loader.load(manager, category);
    const urls = await this.loader.resolveAggregateUrls(aggregate);
    return toAdminCategoryDetail(aggregate, urls);
  }

  private async insertWithUniqueSlug(
    dto: CreateServiceCategoryDto,
    viTitle: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const slug =
        dto.slug ??
        (await generateUniqueSlug(viTitle, (candidate) => this.isSlugTaken(candidate), {
          fallback: 'service',
        }));
      try {
        return await this.dataSource.transaction(async (manager) => {
          const nextOrder = await manager
            .createQueryBuilder(ServiceCategory, 'category')
            .select('COALESCE(MAX(category.sortOrder), -1) + 1', 'next')
            .getRawOne<{ next: string }>();
          const category = await manager.save(
            manager.create(ServiceCategory, {
              slug,
              iconKey: dto.iconKey,
              status: PublicationStatus.DRAFT,
              sortOrder: dto.sortOrder ?? Number(nextOrder?.next ?? 0),
              coverImageId: dto.coverImageId ?? null,
              heroImageId: dto.heroImageId ?? null,
              publishedAt: null,
            }),
          );
          await this.upsertTranslations(manager, category.id, dto.translations);
          await this.applyCollections(manager, category.id, dto);
          return category.id;
        });
      } catch (error) {
        if (!isUniqueViolation(error, SERVICE_SLUG_UNIQUE_INDEX)) throw error;
        if (dto.slug || attempt === 1) {
          throw conflict(ErrorCode.CONFLICT, 'This slug is already in use');
        }
      }
    }
    throw conflict(ErrorCode.CONFLICT, 'Could not allocate a unique slug');
  }

  private async isSlugTaken(slug: string): Promise<boolean> {
    if (RESERVED_SERVICE_SLUGS.includes(slug)) return true;
    return this.categories.exists({ where: { slug } });
  }

  private async upsertTranslations(
    manager: EntityManager,
    categoryId: string,
    input?: ServiceCategoryTranslationsDto,
  ): Promise<void> {
    if (!input) return;
    for (const locale of SUPPORTED_LOCALES) {
      const values = input[locale];
      if (!values) continue;
      const row =
        (await manager.findOne(ServiceCategoryTranslation, { where: { categoryId, locale } })) ??
        manager.create(ServiceCategoryTranslation, { categoryId, locale });
      for (const field of REQUIRED_TEXT_FIELDS) {
        if (values[field] !== undefined) row[field] = values[field] ?? '';
      }
      for (const field of OPTIONAL_TEXT_FIELDS) {
        if (values[field] !== undefined) row[field] = values[field] ?? null;
      }
      for (const field of SEO_TEXT_FIELDS) {
        if (values[field] !== undefined) row[field] = values[field] ?? null;
      }
      if (values.noIndex !== undefined) row.noIndex = values.noIndex;
      if (values.ogImageId !== undefined) row.ogImageId = values.ogImageId ?? null;
      await manager.save(row);
    }
  }

  private async applyCollections(
    manager: EntityManager,
    categoryId: string,
    dto: ServiceCategoryContentDto,
  ): Promise<void> {
    const payload = dto as unknown as CollectionPayload;
    for (const key of CATEGORY_COLLECTION_KEYS) {
      if (key === 'partnerBanner') continue;
      if (payload[key] === undefined) continue;
      await this.collections.replace(manager, CATEGORY_COLLECTIONS[key], categoryId, payload[key]);
    }
    if (dto.partnerBanner !== undefined) {
      await this.collections.replace(
        manager,
        CATEGORY_COLLECTIONS.partnerBanner,
        categoryId,
        dto.partnerBanner ? [dto.partnerBanner as unknown as CollectionItemInput] : [],
      );
    }
  }

  private async assertMediaExist(dto: ServiceCategoryContentDto): Promise<void> {
    const ids: string[] = [];
    if (dto.coverImageId) ids.push(dto.coverImageId);
    if (dto.heroImageId) ids.push(dto.heroImageId);
    for (const locale of SUPPORTED_LOCALES) {
      const ogImageId = dto.translations?.[locale]?.ogImageId;
      if (ogImageId) ids.push(ogImageId);
    }
    const payload = dto as unknown as CollectionPayload;
    for (const key of CATEGORY_COLLECTION_KEYS) {
      if (key === 'partnerBanner') continue;
      ids.push(...this.collections.collectMediaIds(CATEGORY_COLLECTIONS[key], payload[key] ?? []));
    }
    if (dto.partnerBanner) {
      ids.push(
        ...this.collections.collectMediaIds(CATEGORY_COLLECTIONS.partnerBanner, [
          dto.partnerBanner as unknown as CollectionItemInput,
        ]),
      );
    }
    await this.media.assertAllExist(ids);
  }

  private async assertProductLinksExist(dto: ServiceCategoryContentDto): Promise<void> {
    const payload = dto as unknown as CollectionPayload;
    const products = payload.products as unknown as ProductInputDto[] | undefined;
    if (!products) return;
    await this.productLinks.assertLinksExist(products);
  }

  // Publishing needs every required text in both locales, for the page itself and for every repeated block
  private assertPublishable(aggregate: ServiceCategoryAggregate): void {
    const missing: MissingTranslation[] = [];
    for (const locale of SUPPORTED_LOCALES) {
      const translation = aggregate.translations.find((row) => row.locale === (locale as Locale));
      for (const field of REQUIRED_TEXT_FIELDS) {
        if (!translation || !translation[field]?.trim()) missing.push({ locale, field });
      }
    }
    for (const key of CATEGORY_COLLECTION_KEYS) {
      missing.push(
        ...this.collections.findMissingTranslations(
          CATEGORY_COLLECTIONS[key],
          aggregate.collections[key],
          key,
        ),
      );
    }
    if (missing.length > 0) throw translationMissing(missing);
  }
}
