import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  AdminGalleryItemDto,
  AdminProductDetailDto,
  AdminProductListItemDto,
  AdminProductPriceResponseDto,
  AdminProductTranslationDto,
  ProductCardDto,
  ProductPriceResponseDto,
  ProductSeoDto,
  PublicProductDetailDto,
} from '../dto/product-response.dto';
import { ProductImage } from '../entities/product-image.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { ProductTranslation } from '../entities/product-translation.entity';
import { Product } from '../entities/product.entity';
import { BillingPeriod } from '../enums/billing-period.enum';

const BILLING_ORDER: Record<BillingPeriod, number> = {
  [BillingPeriod.ONE_TIME]: 0,
  [BillingPeriod.MONTHLY]: 1,
  [BillingPeriod.YEARLY]: 2,
};

export function sortPrices<Price extends Pick<ProductPrice, 'currency' | 'billingPeriod'>>(
  prices: readonly Price[],
): Price[] {
  return [...prices].sort(
    (left, right) =>
      left.currency.localeCompare(right.currency) ||
      BILLING_ORDER[left.billingPeriod] - BILLING_ORDER[right.billingPeriod],
  );
}

export function toPriceDto(price: ProductPrice): ProductPriceResponseDto {
  return {
    currency: price.currency,
    amount: price.amount,
    billingPeriod: price.billingPeriod,
    isDefault: price.isDefault,
  };
}

export function toAdminPriceDto(price: ProductPrice): AdminProductPriceResponseDto {
  return { id: price.id, ...toPriceDto(price) };
}

// The requested locale wins; the default locale keeps a half-translated legacy row usable
export function pickTranslation(
  translations: readonly ProductTranslation[] | undefined,
  locale: Locale,
): ProductTranslation | null {
  const rows = translations ?? [];
  return (
    rows.find((row) => row.locale === locale) ??
    rows.find((row) => row.locale === DEFAULT_LOCALE) ??
    rows[0] ??
    null
  );
}

function pickField(
  translations: readonly ProductTranslation[] | undefined,
  locale: Locale,
  read: (row: ProductTranslation) => string | null,
): string | null {
  const preferred = translations?.find((row) => row.locale === locale);
  const fromPreferred = preferred ? read(preferred) : null;
  if (fromPreferred) return fromPreferred;
  const fallback = translations?.find((row) => row.locale === DEFAULT_LOCALE);
  return fallback ? read(fallback) : null;
}

export interface CardSource {
  product: Product;
  translations: readonly ProductTranslation[] | undefined;
  prices: readonly ProductPrice[] | undefined;
  coverImageUrl: string | null;
}

export function toProductCard(source: CardSource, locale: Locale): ProductCardDto {
  const { product } = source;
  return {
    id: product.id,
    slug: product.slug,
    type: product.type,
    name: pickField(source.translations, locale, (row) => row.name) ?? product.slug,
    tagline: pickField(source.translations, locale, (row) => row.tagline),
    coverImageUrl: source.coverImageUrl,
    isFeatured: product.isFeatured,
    priceOnRequest: product.priceOnRequest,
    hasDemo: product.demoUrl !== null,
    prices: sortPrices(source.prices ?? []).map(toPriceDto),
  };
}

export interface PublicDetailSource extends CardSource {
  gallery: readonly string[];
  category: { slug: string; name: string } | null;
  ogImageUrl: string | null;
  related: ProductCardDto[];
}

export function toPublicDetail(source: PublicDetailSource, locale: Locale): PublicProductDetailDto {
  const { product, translations } = source;
  const card = toProductCard(source, locale);
  const preferred = translations?.find((row) => row.locale === locale) ?? null;
  const fallback = translations?.find((row) => row.locale === DEFAULT_LOCALE) ?? null;
  const localized = preferred ?? fallback;
  const seo: ProductSeoDto = {
    title: pickField(translations, locale, (row) => row.seoTitle) ?? card.name,
    description: pickField(translations, locale, (row) => row.seoDescription) ?? card.tagline,
    keywords: pickField(translations, locale, (row) => row.seoKeywords),
    canonicalUrl: pickField(translations, locale, (row) => row.canonicalUrl),
    noIndex: localized?.noIndex ?? false,
    ogImageUrl: source.ogImageUrl ?? source.coverImageUrl,
  };
  return {
    ...card,
    descriptionHtml: pickField(translations, locale, (row) => row.descriptionHtml),
    features: (preferred?.features?.length ? preferred.features : fallback?.features) ?? [],
    galleryUrls: [...source.gallery],
    techStack: product.techStack,
    specifications: product.specifications,
    demo: product.demoUrl ? { url: product.demoUrl, mode: product.demoMode } : null,
    category: source.category,
    publishedAt: product.publishedAt,
    seo,
    related: source.related,
  };
}

export function findMissingLocales(
  translations: readonly ProductTranslation[] | undefined,
): string[] {
  return SUPPORTED_LOCALES.filter((locale) => {
    const row = translations?.find((item) => item.locale === locale);
    return !row || !row.name?.trim() || !row.tagline?.trim() || !row.descriptionHtml?.trim();
  });
}

export interface AdminSource {
  product: Product;
  translations: readonly ProductTranslation[] | undefined;
  prices: readonly ProductPrice[] | undefined;
  coverImageUrl: string | null;
}

export function toAdminListItem(source: AdminSource): AdminProductListItemDto {
  const { product, translations } = source;
  const names: Record<string, string | null> = {};
  for (const locale of SUPPORTED_LOCALES) {
    names[locale] = translations?.find((row) => row.locale === locale)?.name ?? null;
  }
  return {
    id: product.id,
    slug: product.slug,
    type: product.type,
    status: product.status,
    sku: product.sku,
    isFeatured: product.isFeatured,
    priceOnRequest: product.priceOnRequest,
    categoryId: product.categoryId,
    names,
    missingLocales: findMissingLocales(translations),
    coverImageUrl: source.coverImageUrl,
    prices: sortPrices(source.prices ?? []).map(toAdminPriceDto),
    publishedAt: product.publishedAt,
    authorId: product.authorId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    version: product.version,
  };
}

function toAdminTranslation(row: ProductTranslation): AdminProductTranslationDto {
  return {
    name: row.name,
    tagline: row.tagline,
    descriptionHtml: row.descriptionHtml,
    features: row.features,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    seoKeywords: row.seoKeywords,
    canonicalUrl: row.canonicalUrl,
    noIndex: row.noIndex,
    ogImageId: row.ogImageId,
  };
}

export function toAdminDetail(
  source: AdminSource,
  gallery: readonly ProductImage[],
  galleryUrls: ReadonlyMap<string, string>,
): AdminProductDetailDto {
  const { product, translations } = source;
  const translationMap: Record<string, AdminProductTranslationDto> = {};
  for (const row of translations ?? []) translationMap[row.locale] = toAdminTranslation(row);
  const galleryItems: AdminGalleryItemDto[] = gallery.map((image) => ({
    mediaAssetId: image.mediaAssetId,
    url: galleryUrls.get(image.mediaAssetId) ?? null,
    sortOrder: image.sortOrder,
  }));
  return {
    ...toAdminListItem(source),
    coverImageId: product.coverImageId,
    gallery: galleryItems,
    demoUrl: product.demoUrl,
    demoMode: product.demoMode,
    techStack: product.techStack,
    specifications: product.specifications,
    sortOrder: product.sortOrder,
    createdById: product.createdById,
    translations: translationMap,
  };
}
