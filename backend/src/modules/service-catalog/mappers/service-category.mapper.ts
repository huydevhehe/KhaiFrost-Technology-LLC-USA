import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import { SeoTranslationEntity } from '../../../common/entities/seo-translation.entity';
import {
  ServiceCategoryDetailResponseDto,
  ServiceCategoryListItemResponseDto,
  ServicesOverviewAdminResponseDto,
  PublicServiceCardResponseDto,
  PublicServiceDetailResponseDto,
  PublicServicesOverviewResponseDto,
} from '../dto/service-response.dto';
import { ServiceCategory } from '../entities/service-category.entity';
import { ServiceCategoryTranslation } from '../entities/service-category-translation.entity';
import { CATEGORY_COLLECTIONS, OVERVIEW_COLLECTIONS } from '../services/collection-definitions';
import { CollectionDefinition, CollectionItemRecord } from '../services/collection-definition';

export type CategoryCollections = Record<keyof typeof CATEGORY_COLLECTIONS, CollectionItemRecord[]>;

export interface ServiceCategoryAggregate {
  category: ServiceCategory;
  translations: ServiceCategoryTranslation[];
  collections: CategoryCollections;
}

export type MediaUrlMap = Map<string, string>;

type Loose = Record<string, unknown>;

const urlKey = (mediaField: string) => mediaField.replace(/Id$/, 'Url');

function urlOf(urls: MediaUrlMap, id: string | null | undefined): string | null {
  return id ? (urls.get(id) ?? null) : null;
}

export function collectAggregateMediaIds(aggregate: ServiceCategoryAggregate): string[] {
  const ids: string[] = [];
  const { category, translations, collections } = aggregate;
  if (category.coverImageId) ids.push(category.coverImageId);
  if (category.heroImageId) ids.push(category.heroImageId);
  for (const translation of translations) {
    if (translation.ogImageId) ids.push(translation.ogImageId);
  }
  ids.push(...collectRecordMediaIds(CATEGORY_COLLECTIONS, collections));
  return ids;
}

export function collectRecordMediaIds(
  definitions: Record<string, CollectionDefinition>,
  collections: Record<string, CollectionItemRecord[]>,
): string[] {
  const ids: string[] = [];
  for (const [key, definition] of Object.entries(definitions)) {
    for (const record of collections[key] ?? []) {
      for (const field of definition.mediaFields) {
        const value = record.fields[field];
        if (typeof value === 'string') ids.push(value);
      }
    }
  }
  return ids;
}

function toAdminItem(
  definition: CollectionDefinition,
  record: CollectionItemRecord,
  urls: MediaUrlMap,
): Loose {
  const item: Loose = { id: record.id, sortOrder: record.sortOrder, ...record.fields };
  for (const field of definition.mediaFields) {
    item[urlKey(field)] = urlOf(urls, record.fields[field] as string | null);
  }
  item.translations = record.translations;
  return item;
}

function toPublicItem(
  definition: CollectionDefinition,
  record: CollectionItemRecord,
  locale: Locale,
  urls: MediaUrlMap,
): Loose {
  const item: Loose = { id: record.id };
  for (const name of [...definition.scalarFields, ...definition.arrayFields]) {
    item[name] = record.fields[name];
  }
  for (const field of definition.mediaFields) {
    item[urlKey(field)] = urlOf(urls, record.fields[field] as string | null);
  }
  const localized = record.translations[locale] ?? {};
  for (const field of definition.translationFields)
    item[field.name] = localized[field.name] ?? null;
  return item;
}

function toAdminItems(
  definition: CollectionDefinition,
  records: CollectionItemRecord[],
  urls: MediaUrlMap,
): Loose[] {
  return records.map((record) => toAdminItem(definition, record, urls));
}

function toPublicItems(
  definition: CollectionDefinition,
  records: CollectionItemRecord[],
  locale: Locale,
  urls: MediaUrlMap,
): Loose[] {
  return records.map((record) => toPublicItem(definition, record, locale, urls));
}

// The frontend shows two-digit step numbers ("01")
function withStepNumbers(items: Loose[]): Loose[] {
  return items.map((item, index) => ({ ...item, step: String(index + 1).padStart(2, '0') }));
}

const CATEGORY_TRANSLATION_FIELDS = [
  'title',
  'categoryName',
  'summary',
  'heroTitle',
  'heroSubtitle',
  'productsEyebrow',
  'productsHeading',
  'productsIntro',
] as const;

function toSeoAdmin(translation: SeoTranslationEntity, urls: MediaUrlMap): Loose {
  return {
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    seoKeywords: translation.seoKeywords,
    canonicalUrl: translation.canonicalUrl,
    noIndex: translation.noIndex,
    ogImageId: translation.ogImageId,
    ogImageUrl: urlOf(urls, translation.ogImageId),
  };
}

export function toAdminCategoryDetail(
  aggregate: ServiceCategoryAggregate,
  urls: MediaUrlMap,
): ServiceCategoryDetailResponseDto {
  const { category, translations, collections } = aggregate;
  const translationsByLocale: Loose = {};
  for (const locale of SUPPORTED_LOCALES) {
    const row = translations.find((candidate) => candidate.locale === locale);
    if (!row) continue;
    const values: Loose = {};
    for (const field of CATEGORY_TRANSLATION_FIELDS) values[field] = row[field];
    translationsByLocale[locale] = { ...values, ...toSeoAdmin(row, urls) };
  }
  const banner = collections.partnerBanner[0];
  return {
    id: category.id,
    slug: category.slug,
    status: category.status,
    sortOrder: category.sortOrder,
    iconKey: category.iconKey,
    coverImageId: category.coverImageId,
    coverImageUrl: urlOf(urls, category.coverImageId),
    heroImageId: category.heroImageId,
    heroImageUrl: urlOf(urls, category.heroImageId),
    publishedAt: category.publishedAt,
    version: category.version,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    createdById: category.createdById,
    translations: translationsByLocale,
    stats: toAdminItems(CATEGORY_COLLECTIONS.stats, collections.stats, urls),
    products: toAdminItems(CATEGORY_COLLECTIONS.products, collections.products, urls),
    processSteps: toAdminItems(CATEGORY_COLLECTIONS.processSteps, collections.processSteps, urls),
    whyUs: toAdminItems(CATEGORY_COLLECTIONS.whyUs, collections.whyUs, urls),
    caseStudies: toAdminItems(CATEGORY_COLLECTIONS.caseStudies, collections.caseStudies, urls),
    testimonials: toAdminItems(CATEGORY_COLLECTIONS.testimonials, collections.testimonials, urls),
    faq: toAdminItems(CATEGORY_COLLECTIONS.faq, collections.faq, urls),
    partnerBanner: banner ? toAdminItem(CATEGORY_COLLECTIONS.partnerBanner, banner, urls) : null,
  };
}

export function toAdminListItem(
  category: ServiceCategory,
  translations: ServiceCategoryTranslation[],
  urls: MediaUrlMap,
): ServiceCategoryListItemResponseDto {
  const titleOf = (locale: Locale) =>
    translations.find((row) => row.locale === locale)?.title ?? '';
  return {
    id: category.id,
    slug: category.slug,
    status: category.status,
    sortOrder: category.sortOrder,
    iconKey: category.iconKey,
    titles: { vi: titleOf(Locale.VI), en: titleOf(Locale.EN) },
    coverImageUrl: urlOf(urls, category.coverImageId),
    publishedAt: category.publishedAt,
    version: category.version,
    updatedAt: category.updatedAt,
  };
}

export function toPublicCard(
  category: ServiceCategory,
  translation: ServiceCategoryTranslation | undefined,
  urls: MediaUrlMap,
): PublicServiceCardResponseDto {
  return {
    slug: category.slug,
    iconKey: category.iconKey,
    title: translation?.title ?? '',
    summary: translation?.summary ?? '',
    imageUrl: urlOf(urls, category.coverImageId),
  };
}

export function toPublicDetail(
  aggregate: ServiceCategoryAggregate,
  locale: Locale,
  urls: MediaUrlMap,
): PublicServiceDetailResponseDto {
  const { category, translations, collections } = aggregate;
  const translation = translations.find((row) => row.locale === locale);
  const banner = collections.partnerBanner[0];
  return {
    ...toPublicCard(category, translation, urls),
    categoryName: translation?.categoryName ?? '',
    heroTitle: translation?.heroTitle ?? '',
    heroSubtitle: translation?.heroSubtitle ?? '',
    heroImageUrl: urlOf(urls, category.heroImageId) ?? urlOf(urls, category.coverImageId),
    productsEyebrow: translation?.productsEyebrow ?? null,
    productsHeading: translation?.productsHeading ?? null,
    productsIntro: translation?.productsIntro ?? null,
    seo: translation
      ? {
          title: translation.seoTitle,
          description: translation.seoDescription,
          keywords: translation.seoKeywords,
          canonicalUrl: translation.canonicalUrl,
          noIndex: translation.noIndex,
          ogImageUrl: urlOf(urls, translation.ogImageId),
        }
      : null,
    stats: toPublicItems(CATEGORY_COLLECTIONS.stats, collections.stats, locale, urls),
    products: toPublicItems(CATEGORY_COLLECTIONS.products, collections.products, locale, urls),
    processSteps: withStepNumbers(
      toPublicItems(CATEGORY_COLLECTIONS.processSteps, collections.processSteps, locale, urls),
    ),
    whyUs: toPublicItems(CATEGORY_COLLECTIONS.whyUs, collections.whyUs, locale, urls),
    caseStudies: toPublicItems(
      CATEGORY_COLLECTIONS.caseStudies,
      collections.caseStudies,
      locale,
      urls,
    ),
    testimonials: toPublicItems(
      CATEGORY_COLLECTIONS.testimonials,
      collections.testimonials,
      locale,
      urls,
    ),
    faq: toPublicItems(CATEGORY_COLLECTIONS.faq, collections.faq, locale, urls),
    partnerBanner: banner
      ? toPublicItem(CATEGORY_COLLECTIONS.partnerBanner, banner, locale, urls)
      : null,
  };
}

export type OverviewCollections = {
  stats: CollectionItemRecord[];
  processSteps: CollectionItemRecord[];
  highlights: CollectionItemRecord[];
};

export function toAdminOverview(
  collections: OverviewCollections,
  urls: MediaUrlMap,
): ServicesOverviewAdminResponseDto {
  return {
    stats: toAdminItems(OVERVIEW_COLLECTIONS.stats, collections.stats, urls),
    processSteps: toAdminItems(OVERVIEW_COLLECTIONS.processSteps, collections.processSteps, urls),
    highlights: toAdminItems(OVERVIEW_COLLECTIONS.highlights, collections.highlights, urls),
  };
}

export function toPublicOverview(
  cards: PublicServiceCardResponseDto[],
  collections: OverviewCollections,
  locale: Locale,
  urls: MediaUrlMap,
): PublicServicesOverviewResponseDto {
  return {
    services: cards,
    stats: toPublicItems(OVERVIEW_COLLECTIONS.stats, collections.stats, locale, urls),
    processSteps: withStepNumbers(
      toPublicItems(OVERVIEW_COLLECTIONS.processSteps, collections.processSteps, locale, urls),
    ),
    highlights: toPublicItems(
      OVERVIEW_COLLECTIONS.highlights,
      collections.highlights,
      locale,
      urls,
    ),
  };
}
