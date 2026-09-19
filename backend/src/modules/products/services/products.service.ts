import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { toSkipTake } from '../../../common/dto/paginate';
import { Locale } from '../../../common/enums/locale.enum';
import { notFound } from '../../../common/exceptions/exception.factories';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import {
  ProductCardDto,
  ProductSlugDto,
  PublicProductDetailDto,
} from '../dto/product-response.dto';
import { PublicProductListQueryDto, PublicProductSort } from '../dto/public-product-list-query.dto';
import { ProductCategoryTranslation } from '../entities/product-category-translation.entity';
import { Product } from '../entities/product.entity';
import { mapPurchaseInfo, ProductPurchaseInfo } from '../mappers/product-purchase-info';
import { pickTranslation, toProductCard, toPublicDetail } from '../mappers/product.mapper';
import { VISIBLE_PRODUCT_CONDITION, VISIBLE_PRODUCT_PARAMETERS } from '../utils/product-visibility';
import {
  ProductAggregateParts,
  ProductDataRepository,
} from '../repositories/product-data.repository';

const RELATED_LIMIT = 4;
const SLUG_LIMIT = 5000;

const PRICE_SORT_EXPRESSION =
  '(SELECT MIN(pp.amount) FROM product_prices pp WHERE pp.product_id = product.id AND pp.currency = :sortCurrency)';
const NAME_SORT_EXPRESSION =
  "LOWER(COALESCE((SELECT t.name FROM product_translations t WHERE t.product_id = product.id AND t.locale = :sortLocale), (SELECT t.name FROM product_translations t WHERE t.product_id = product.id AND t.locale = 'vi')))";

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductCategoryTranslation)
    private readonly categoryTranslations: Repository<ProductCategoryTranslation>,
    private readonly productData: ProductDataRepository,
    private readonly mediaReference: MediaReferenceService,
  ) {}

  async listPublic(
    query: PublicProductListQueryDto,
  ): Promise<PaginatedResponseDto<ProductCardDto>> {
    const base = this.visibleQuery();
    if (query.type) base.andWhere('product.type = :type', { type: query.type });
    if (query.featured !== undefined) {
      base.andWhere('product.isFeatured = :featured', { featured: query.featured });
    }
    if (query.categorySlug) {
      base.andWhere(
        'product.categoryId = (SELECT c.id FROM product_categories c WHERE c.slug = :categorySlug AND c.deleted_at IS NULL)',
        { categorySlug: query.categorySlug },
      );
    }
    if (query.search) {
      base.andWhere(
        `(product.slug ILIKE :search OR EXISTS (SELECT 1 FROM product_translations st WHERE st.product_id = product.id AND (st.name ILIKE :search OR st.tagline ILIKE :search)))`,
        { search: containsPattern(query.search) },
      );
    }

    const total = await base.clone().getCount();
    const page = base.clone().select('product.id', 'id');
    this.applyPublicSort(page, query);
    const rows = await page
      .offset(toSkipTake(query).skip)
      .limit(query.pageSize)
      .getRawMany<{ id: string }>();

    const cards = await this.buildCardsInOrder(
      rows.map((row) => row.id),
      query.locale,
    );
    return new PaginatedResponseDto(cards, {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  }

  async getPublicDetail(slug: string, locale: Locale): Promise<PublicProductDetailDto> {
    const product = await this.visibleQuery().andWhere('product.slug = :slug', { slug }).getOne();
    if (!product) throw notFound('Product');

    const [parts, gallery, related, category] = await Promise.all([
      this.productData.loadParts([product.id]),
      this.productData.loadGallery([product.id]),
      this.findRelated(product, locale),
      this.findCategorySummary(product, locale),
    ]);
    const translations = parts.translations.get(product.id);
    const ogImageId = pickTranslation(translations, locale)?.ogImageId ?? null;
    const galleryRows = gallery.get(product.id) ?? [];
    const mediaIds = [
      ...(product.coverImageId ? [product.coverImageId] : []),
      ...(ogImageId ? [ogImageId] : []),
      ...galleryRows.map((image) => image.mediaAssetId),
    ];
    const urls = await this.mediaReference.resolveUrls(mediaIds);

    return toPublicDetail(
      {
        product,
        translations,
        prices: parts.prices.get(product.id),
        coverImageUrl: product.coverImageId ? (urls.get(product.coverImageId) ?? null) : null,
        gallery: galleryRows.flatMap((image) => {
          const url = urls.get(image.mediaAssetId);
          return url ? [url] : [];
        }),
        category,
        ogImageUrl: ogImageId ? (urls.get(ogImageId) ?? null) : null,
        related,
      },
      locale,
    );
  }

  async listSlugs(): Promise<ProductSlugDto[]> {
    const rows = await this.visibleQuery()
      .select(['product.id', 'product.slug', 'product.updatedAt'])
      .orderBy('product.slug', 'ASC')
      .limit(SLUG_LIMIT)
      .getMany();
    return rows.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt }));
  }

  // Cards for the published subset of `ids`, following the order of `ids`; unpublished ids are silently absent
  async getPublishedByIds(ids: readonly string[], locale: Locale): Promise<ProductCardDto[]> {
    const visibleIds = await this.filterPublishedIds(ids);
    return this.buildCardsInOrder(
      [...new Set(ids)].filter((id) => visibleIds.has(id)),
      locale,
    );
  }

  async filterPublishedIds(ids: readonly string[]): Promise<Set<string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Set();
    const rows = await this.visibleQuery()
      .select('product.id', 'id')
      .andWhere('product.id IN (:...ids)', { ids: unique })
      .getRawMany<{ id: string }>();
    return new Set(rows.map((row) => row.id));
  }

  async isPublished(productId: string): Promise<boolean> {
    return (await this.filterPublishedIds([productId])).has(productId);
  }

  async isPurchasable(productId: string): Promise<boolean> {
    const info = (await this.getPurchaseInfoByIds([productId], Locale.VI)).get(productId);
    return info?.isPurchasable ?? false;
  }

  // Everything the cart needs, for products in any status; soft-deleted products are absent from the map
  async getPurchaseInfoByIds(
    ids: readonly string[],
    locale: Locale,
  ): Promise<Map<string, ProductPurchaseInfo>> {
    const unique = [...new Set(ids)];
    const result = new Map<string, ProductPurchaseInfo>();
    if (unique.length === 0) return result;

    const [products, visibleIds] = await Promise.all([
      this.productData.findProductsInOrder(unique),
      this.filterPublishedIds(unique),
    ]);
    const parts = await this.productData.loadParts(products.map((product) => product.id));
    const cards = await this.cardsFor(products, parts, locale);

    products.forEach((product, index) => {
      const prices = parts.prices.get(product.id) ?? [];
      result.set(
        product.id,
        mapPurchaseInfo(product, cards[index], prices, visibleIds.has(product.id)),
      );
    });
    return result;
  }

  private visibleQuery(): SelectQueryBuilder<Product> {
    return this.products
      .createQueryBuilder('product')
      .where(VISIBLE_PRODUCT_CONDITION, VISIBLE_PRODUCT_PARAMETERS);
  }

  private applyPublicSort(qb: SelectQueryBuilder<Product>, query: PublicProductListQueryDto): void {
    switch (query.sort) {
      case PublicProductSort.PRICE_ASC:
      case PublicProductSort.PRICE_DESC:
        qb.addSelect(PRICE_SORT_EXPRESSION, 'sort_price')
          .setParameter('sortCurrency', query.currency)
          .orderBy(
            'sort_price',
            query.sort === PublicProductSort.PRICE_ASC ? 'ASC' : 'DESC',
            'NULLS LAST',
          );
        break;
      case PublicProductSort.NAME:
        qb.addSelect(NAME_SORT_EXPRESSION, 'sort_name')
          .setParameter('sortLocale', query.locale)
          .orderBy('sort_name', 'ASC');
        break;
      default:
        qb.orderBy('product.publishedAt', 'DESC');
    }
    qb.addOrderBy('product.id', 'ASC');
  }

  private async findRelated(product: Product, locale: Locale): Promise<ProductCardDto[]> {
    const qb = this.visibleQuery()
      .select('product.id', 'id')
      .andWhere('product.id <> :selfId', { selfId: product.id });
    if (product.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId: product.categoryId });
    } else {
      qb.andWhere('product.type = :type', { type: product.type });
    }
    const rows = await qb
      .orderBy('product.isFeatured', 'DESC')
      .addOrderBy('product.sortOrder', 'ASC')
      .addOrderBy('product.publishedAt', 'DESC')
      .addOrderBy('product.id', 'ASC')
      .limit(RELATED_LIMIT)
      .getRawMany<{ id: string }>();
    return this.buildCardsInOrder(
      rows.map((row) => row.id),
      locale,
    );
  }

  private async findCategorySummary(
    product: Product,
    locale: Locale,
  ): Promise<{ slug: string; name: string } | null> {
    if (!product.categoryId) return null;
    const rows = await this.categoryTranslations
      .createQueryBuilder('translation')
      .innerJoinAndSelect('translation.category', 'category')
      .where('translation.categoryId = :categoryId', { categoryId: product.categoryId })
      .getMany();
    const chosen = rows.find((row) => row.locale === locale) ?? rows[0];
    return chosen?.category ? { slug: chosen.category.slug, name: chosen.name } : null;
  }

  private async buildCardsInOrder(
    ids: readonly string[],
    locale: Locale,
  ): Promise<ProductCardDto[]> {
    if (ids.length === 0) return [];
    const products = await this.productData.findProductsInOrder(ids);
    const parts = await this.productData.loadParts(products.map((product) => product.id));
    return this.cardsFor(products, parts, locale);
  }

  private async cardsFor(
    products: readonly Product[],
    parts: ProductAggregateParts,
    locale: Locale,
  ): Promise<ProductCardDto[]> {
    const urls = await this.mediaReference.resolveUrls(
      products.flatMap((product) => (product.coverImageId ? [product.coverImageId] : [])),
    );
    return products.map((product) =>
      toProductCard(
        {
          product,
          translations: parts.translations.get(product.id),
          prices: parts.prices.get(product.id),
          coverImageUrl: product.coverImageId ? (urls.get(product.coverImageId) ?? null) : null,
        },
        locale,
      ),
    );
  }
}
