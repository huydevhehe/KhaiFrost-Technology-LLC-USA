import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DomainEvent } from '../../../common/constants/domain-events';
import { Permission } from '../../../common/constants/permissions';
import { roleHasPermission } from '../../../common/constants/role-permissions';
import { paginate, resolveSort, toSkipTake } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Locale } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import {
  conflict,
  forbidden,
  notFound,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { assertCanModifyContent } from '../../../common/policies/content-ownership.policy';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { generateUniqueSlug } from '../../../common/utils/unique-slug';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import {
  ADMIN_PRODUCT_SORT_FIELDS,
  AdminProductListQueryDto,
} from '../dto/admin-product-list-query.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { AdminProductDetailDto, AdminProductListItemDto } from '../dto/product-response.dto';
import { PublishProductDto, TransitionProductDto } from '../dto/transition-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductTranslation } from '../entities/product-translation.entity';
import { Product } from '../entities/product.entity';
import { DemoMode } from '../enums/demo-mode.enum';
import { toAdminDetail, toAdminListItem } from '../mappers/product.mapper';
import {
  assertPublishable,
  ProductTransition,
  resolveTransition,
} from '../policies/product-publication.policy';
import { ProductDataRepository } from '../repositories/product-data.repository';
import { normalizePrices, NormalizedPrice } from '../utils/normalize-prices';
import { ProductAggregateWriter, TranslationPatches } from './product-aggregate-writer';

const NULLABLE_SCALARS: ReadonlySet<string> = new Set([
  'sku',
  'categoryId',
  'coverImageId',
  'demoUrl',
]);
const SLUG_INDEX = 'uq_products_slug';
const SKU_INDEX = 'uq_products_sku';

const MISSING_LOCALE_CONDITION = `NOT EXISTS (SELECT 1 FROM product_translations mt WHERE mt.product_id = product.id AND mt.locale = :missingLocale AND COALESCE(TRIM(mt.name), '') <> '' AND COALESCE(TRIM(mt.tagline), '') <> '' AND COALESCE(TRIM(mt.description_html), '') <> '')`;

@Injectable()
export class ProductsAdminService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly productData: ProductDataRepository,
    private readonly writer: ProductAggregateWriter,
    private readonly mediaReference: MediaReferenceService,
    private readonly events: EventEmitter2,
  ) {}

  async list(
    query: AdminProductListQueryDto,
  ): Promise<PaginatedResponseDto<AdminProductListItemDto>> {
    const base = this.products.createQueryBuilder('product');
    if (query.status) base.andWhere('product.status = :status', { status: query.status });
    if (query.type) base.andWhere('product.type = :type', { type: query.type });
    if (query.categoryId) {
      base.andWhere('product.categoryId = :categoryId', { categoryId: query.categoryId });
    }
    if (query.featured !== undefined) {
      base.andWhere('product.isFeatured = :featured', { featured: query.featured });
    }
    if (query.missingLocale) {
      base.andWhere(MISSING_LOCALE_CONDITION, { missingLocale: query.missingLocale });
    }
    if (query.search) {
      base.andWhere(
        `(product.slug ILIKE :search OR product.sku ILIKE :search OR EXISTS (SELECT 1 FROM product_translations st WHERE st.product_id = product.id AND (st.name ILIKE :search OR st.tagline ILIKE :search)))`,
        { search: containsPattern(query.search) },
      );
    }

    const total = await base.clone().getCount();
    const sort = resolveSort(query, ADMIN_PRODUCT_SORT_FIELDS, 'createdAt');
    const rows = await base
      .clone()
      .select('product.id', 'id')
      .orderBy(`product.${sort.field}`, sort.order, 'NULLS LAST')
      .addOrderBy('product.id', 'ASC')
      .offset(toSkipTake(query).skip)
      .limit(query.pageSize)
      .getRawMany<{ id: string }>();

    const products = await this.productData.findProductsInOrder(rows.map((row) => row.id));
    const parts = await this.productData.loadParts(products.map((product) => product.id));
    const urls = await this.mediaReference.resolveUrls(
      products.flatMap((product) => (product.coverImageId ? [product.coverImageId] : [])),
    );
    return paginate<Product, AdminProductListItemDto>([products, total], query, (product) =>
      toAdminListItem({
        product,
        translations: parts.translations.get(product.id),
        prices: parts.prices.get(product.id),
        coverImageUrl: product.coverImageId ? (urls.get(product.coverImageId) ?? null) : null,
      }),
    );
  }

  async get(id: string): Promise<AdminProductDetailDto> {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw notFound('Product');
    const [parts, galleryByProduct] = await Promise.all([
      this.productData.loadParts([id]),
      this.productData.loadGallery([id]),
    ]);
    const gallery = galleryByProduct.get(id) ?? [];
    const urls = await this.mediaReference.resolveUrls([
      ...(product.coverImageId ? [product.coverImageId] : []),
      ...gallery.map((image) => image.mediaAssetId),
    ]);
    return toAdminDetail(
      {
        product,
        translations: parts.translations.get(id),
        prices: parts.prices.get(id),
        coverImageUrl: product.coverImageId ? (urls.get(product.coverImageId) ?? null) : null,
      },
      gallery,
      urls,
    );
  }

  async create(dto: CreateProductDto, user: AuthenticatedUser): Promise<AdminProductDetailDto> {
    const id = await this.createWithSlugRetry(dto, user);
    return this.get(id);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    user: AuthenticatedUser,
  ): Promise<AdminProductDetailDto> {
    try {
      await this.dataSource.transaction((manager) =>
        this.updateInTransaction(manager, id, dto, user),
      );
    } catch (error) {
      throw this.translateUniqueViolation(error, dto.slug !== undefined) ?? error;
    }
    return this.get(id);
  }

  async transition(
    id: string,
    transition: ProductTransition,
    dto: TransitionProductDto & Partial<Pick<PublishProductDto, 'publishedAt'>>,
    user: AuthenticatedUser,
  ): Promise<AdminProductDetailDto> {
    const submittedName = await this.dataSource.transaction(async (manager) => {
      const product = await this.lockProduct(manager, id);
      if (dto.version !== undefined) assertVersionMatches(product.version, dto.version);
      if (transition === 'submit') {
        assertCanModifyContent(
          user,
          product.createdById,
          Permission.PRODUCT_UPDATE_OWN,
          Permission.PRODUCT_UPDATE_ANY,
        );
      }
      const nextStatus = resolveTransition(transition, product.status);

      const patch: Partial<Product> = { status: nextStatus, updatedById: user.id };
      if (transition === 'publish') {
        await this.assertProductPublishable(manager, product);
        patch.publishedAt = dto.publishedAt ?? product.publishedAt ?? new Date();
      }
      await manager.update(Product, { id }, patch);

      if (transition !== 'submit') return null;
      const name = await manager.findOne(ProductTranslation, {
        where: { productId: id, locale: Locale.VI },
      });
      return name?.name ?? product.slug;
    });

    if (submittedName !== null) {
      const product = await this.products.findOneOrFail({ where: { id } });
      this.events.emit(DomainEvent.PRODUCT_SUBMITTED_FOR_REVIEW, {
        productId: id,
        name: submittedName,
        authorId: product.authorId,
      });
    }
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.products.exists({ where: { id } }))) throw notFound('Product');
    await this.products.softDelete({ id });
  }

  private async createWithSlugRetry(
    dto: CreateProductDto,
    user: AuthenticatedUser,
  ): Promise<string> {
    const attempt = () =>
      this.dataSource.transaction((manager) => this.createInTransaction(manager, dto, user));
    try {
      return await attempt();
    } catch (error) {
      if (!dto.slug && isUniqueViolation(error, SLUG_INDEX)) {
        try {
          return await attempt();
        } catch (retryError) {
          throw this.translateUniqueViolation(retryError, false) ?? retryError;
        }
      }
      throw this.translateUniqueViolation(error, dto.slug !== undefined) ?? error;
    }
  }

  private translateUniqueViolation(error: unknown, slugWasSupplied: boolean): Error | null {
    if (isUniqueViolation(error, SKU_INDEX))
      return conflict('SKU_TAKEN', 'This SKU is already in use');
    if (isUniqueViolation(error, SLUG_INDEX)) {
      return conflict(
        'SLUG_TAKEN',
        slugWasSupplied ? 'This slug is already in use' : 'Could not allocate a unique slug, retry',
      );
    }
    return null;
  }

  private async createInTransaction(
    manager: EntityManager,
    dto: CreateProductDto,
    user: AuthenticatedUser,
  ): Promise<string> {
    const prices = this.resolvePrices(dto.prices ?? [], dto.priceOnRequest ?? false);
    const patches: TranslationPatches = { vi: dto.translations.vi, en: dto.translations.en };
    await this.assertReferences(manager, {
      categoryId: dto.categoryId,
      mediaIds: [
        ...(dto.coverImageId ? [dto.coverImageId] : []),
        ...(dto.galleryImageIds ?? []),
        ...this.writer.collectOgImageIds(patches),
      ],
    });

    const slug = dto.slug
      ? await this.assertSlugFree(manager, dto.slug)
      : await generateUniqueSlug(dto.translations.vi.name, (candidate) =>
          this.isSlugTaken(manager, candidate),
        );

    const product = await manager.save(
      manager.create(Product, {
        slug,
        type: dto.type,
        status: PublicationStatus.DRAFT,
        sku: dto.sku ?? null,
        categoryId: dto.categoryId ?? null,
        coverImageId: dto.coverImageId ?? null,
        demoUrl: dto.demoUrl ?? null,
        demoMode: dto.demoMode ?? DemoMode.EXTERNAL,
        techStack: dto.techStack ?? [],
        specifications: dto.specifications ?? {},
        priceOnRequest: dto.priceOnRequest ?? false,
        isFeatured: dto.isFeatured ?? false,
        sortOrder: dto.sortOrder ?? 0,
        authorId: user.id,
      }),
    );
    await this.writer.upsertTranslations(manager, product.id, patches);
    if (prices.length > 0) await this.writer.replacePrices(manager, product.id, prices);
    if (dto.galleryImageIds?.length) {
      await this.writer.replaceGallery(manager, product.id, dto.galleryImageIds);
    }
    return product.id;
  }

  private async updateInTransaction(
    manager: EntityManager,
    id: string,
    dto: UpdateProductDto,
    user: AuthenticatedUser,
  ): Promise<void> {
    const product = await this.lockProduct(manager, id);
    assertVersionMatches(product.version, dto.version);
    assertCanModifyContent(
      user,
      product.createdById,
      Permission.PRODUCT_UPDATE_OWN,
      Permission.PRODUCT_UPDATE_ANY,
    );
    if (
      product.status !== PublicationStatus.DRAFT &&
      !roleHasPermission(user.role, Permission.PRODUCT_UPDATE_ANY)
    ) {
      throw forbidden('Only drafts can be edited by their author');
    }

    const priceOnRequest = dto.priceOnRequest ?? product.priceOnRequest;
    const nextPrices =
      dto.prices !== undefined ? this.resolvePrices(dto.prices, priceOnRequest) : null;
    if (nextPrices === null && priceOnRequest && !product.priceOnRequest) {
      const existingCount = await manager.count(ProductPrice, { where: { productId: id } });
      if (existingCount > 0) this.throwPriceOnRequestWithPrices();
    }
    const patches: TranslationPatches = { vi: dto.translations?.vi, en: dto.translations?.en };
    await this.assertReferences(manager, {
      categoryId: dto.categoryId,
      mediaIds: [
        ...(dto.coverImageId ? [dto.coverImageId] : []),
        ...(dto.galleryImageIds ?? []),
        ...this.writer.collectOgImageIds(patches),
      ],
    });
    if (dto.slug !== undefined && dto.slug !== product.slug) {
      await this.assertSlugFree(manager, dto.slug);
    }

    const changes: Partial<Product> = { updatedById: user.id };
    const scalarKeys = [
      'slug',
      'type',
      'sku',
      'categoryId',
      'coverImageId',
      'demoUrl',
      'demoMode',
      'techStack',
      'specifications',
      'priceOnRequest',
      'isFeatured',
      'sortOrder',
    ] as const;
    for (const key of scalarKeys) {
      const value = dto[key];
      if (value === undefined) continue;
      if (value === null && !NULLABLE_SCALARS.has(key)) {
        throw validationFailed([{ field: key, messages: [`${key} cannot be null`] }]);
      }
      Object.assign(changes, { [key]: value });
    }
    // Also bumps updatedAt and version when only child rows changed
    await manager.update(Product, { id }, changes);

    await this.writer.upsertTranslations(manager, id, patches);
    if (nextPrices) await this.writer.replacePrices(manager, id, nextPrices);
    if (dto.galleryImageIds !== undefined) {
      await this.writer.replaceGallery(manager, id, dto.galleryImageIds);
    }

    if (product.status === PublicationStatus.PUBLISHED) {
      const updated = await manager.findOneOrFail(Product, { where: { id } });
      await this.assertProductPublishable(manager, updated);
    }
  }

  private resolvePrices(
    inputs: NonNullable<CreateProductDto['prices']>,
    priceOnRequest: boolean,
  ): NormalizedPrice[] {
    if (priceOnRequest && inputs.length > 0) this.throwPriceOnRequestWithPrices();
    return normalizePrices(inputs);
  }

  private throwPriceOnRequestWithPrices(): never {
    throw validationFailed([
      {
        field: 'priceOnRequest',
        messages: ['A price-on-request product cannot have prices; remove them first'],
      },
    ]);
  }

  private async assertProductPublishable(manager: EntityManager, product: Product): Promise<void> {
    const [translations, prices] = await Promise.all([
      manager.find(ProductTranslation, { where: { productId: product.id } }),
      manager.find(ProductPrice, { where: { productId: product.id } }),
    ]);
    assertPublishable({
      type: product.type,
      priceOnRequest: product.priceOnRequest,
      demoUrl: product.demoUrl,
      prices,
      translations,
    });
  }

  private async assertReferences(
    manager: EntityManager,
    references: { categoryId?: string | null; mediaIds: string[] },
  ): Promise<void> {
    await this.mediaReference.assertAllExist(references.mediaIds);
    if (references.categoryId) {
      const exists = await manager.exists(ProductCategory, {
        where: { id: references.categoryId },
      });
      if (!exists) {
        throw validationFailed([{ field: 'categoryId', messages: ['Unknown product category'] }]);
      }
    }
  }

  private async isSlugTaken(manager: EntityManager, slug: string): Promise<boolean> {
    return manager.exists(Product, { where: { slug } });
  }

  private async assertSlugFree(manager: EntityManager, slug: string): Promise<string> {
    if (await this.isSlugTaken(manager, slug)) {
      throw conflict('SLUG_TAKEN', 'This slug is already in use');
    }
    return slug;
  }

  private async lockProduct(manager: EntityManager, id: string): Promise<Product> {
    const product = await manager
      .createQueryBuilder(Product, 'product')
      .setLock('pessimistic_write')
      .where('product.id = :id', { id })
      .getOne();
    if (!product) throw notFound('Product');
    return product;
  }
}
