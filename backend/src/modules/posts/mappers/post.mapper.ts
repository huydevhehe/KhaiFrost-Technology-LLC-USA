import { Locale } from '../../../common/enums/locale.enum';
import { findMissingLocales } from '../domain/post-completeness';
import {
  AdminPostCategoryResponse,
  AdminPostDetailResponse,
  AdminPostListItemResponse,
  AdminPostTranslationResponse,
  AdminPostTranslationsResponse,
  MediaReferenceResponse,
} from '../dto/post-admin-response.dto';
import {
  PublicPostCategoryResponse,
  PublicPostDetailResponse,
  PublicPostListItemResponse,
  PublicPostNeighborResponse,
  PublicPostSeoResponse,
} from '../dto/post-public-response.dto';
import { PostCategory } from '../entities/post-category.entity';
import { PostTranslation } from '../entities/post-translation.entity';
import { Post } from '../entities/post.entity';
import { ResolvedMedia } from '../services/post-media.service';

export type MediaLookup = ReadonlyMap<string, ResolvedMedia>;

function translationOf(
  translations: readonly PostTranslation[] | undefined,
  locale: Locale,
): PostTranslation | undefined {
  return translations?.find((item) => item.locale === locale);
}

function otherLocale(locale: Locale): Locale {
  return locale === Locale.VI ? Locale.EN : Locale.VI;
}

function categoryName(category: PostCategory, locale: Locale): string {
  const translations = category.translations;
  return (
    translations?.find((item) => item.locale === locale)?.name ??
    translations?.find((item) => item.locale === otherLocale(locale))?.name ??
    category.slug
  );
}

function toMediaReference(
  id: string | null | undefined,
  media: MediaLookup,
): MediaReferenceResponse | null {
  const resolved = id ? media.get(id) : undefined;
  return resolved
    ? { id: resolved.id, url: resolved.url, thumbnailUrl: resolved.thumbnailUrl }
    : null;
}

export function collectPostMediaIds(posts: readonly Post[]): string[] {
  const ids: string[] = [];
  for (const post of posts) {
    if (post.coverImageId) ids.push(post.coverImageId);
    for (const translation of post.translations ?? []) {
      if (translation.ogImageId) ids.push(translation.ogImageId);
    }
  }
  return ids;
}

export function toAdminListItem(
  post: Post,
  locale: Locale,
  media: MediaLookup,
): AdminPostListItemResponse {
  const translations = post.translations ?? [];
  const vi = translationOf(translations, Locale.VI)?.title || null;
  const en = translationOf(translations, Locale.EN)?.title || null;
  const preferred = locale === Locale.VI ? vi : en;
  const fallback = locale === Locale.VI ? en : vi;
  return {
    id: post.id,
    slug: post.slug,
    status: post.status,
    isFeatured: post.isFeatured,
    title: preferred ?? fallback ?? '',
    titles: { vi, en },
    category: post.category
      ? {
          id: post.category.id,
          slug: post.category.slug,
          name: categoryName(post.category, locale),
        }
      : null,
    coverThumbnailUrl: post.coverImageId
      ? (media.get(post.coverImageId)?.thumbnailUrl ?? null)
      : null,
    authorId: post.authorId,
    authorName: post.authorName,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    version: post.version,
    missingLocales: findMissingLocales(translations),
  };
}

function toAdminTranslation(
  translation: PostTranslation | undefined,
  media: MediaLookup,
): AdminPostTranslationResponse | null {
  if (!translation) return null;
  return {
    title: translation.title,
    excerpt: translation.excerpt,
    contentHtml: translation.contentHtml,
    tags: translation.tags,
    readingTimeMinutes: translation.readingTimeMinutes,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    seoKeywords: translation.seoKeywords,
    canonicalUrl: translation.canonicalUrl,
    noIndex: translation.noIndex,
    ogImage: toMediaReference(translation.ogImageId, media),
  };
}

export function toAdminDetail(post: Post, media: MediaLookup): AdminPostDetailResponse {
  const translations = post.translations ?? [];
  const category = post.category;
  const names = (locale: Locale) =>
    category?.translations?.find((item) => item.locale === locale)?.name ?? null;
  const translationResponse: AdminPostTranslationsResponse = {
    vi: toAdminTranslation(translationOf(translations, Locale.VI), media),
    en: toAdminTranslation(translationOf(translations, Locale.EN), media),
  };
  return {
    id: post.id,
    slug: post.slug,
    status: post.status,
    isFeatured: post.isFeatured,
    publishedAt: post.publishedAt,
    category: category
      ? {
          id: category.id,
          slug: category.slug,
          names: { vi: names(Locale.VI), en: names(Locale.EN) },
        }
      : null,
    coverImage: toMediaReference(post.coverImageId, media),
    authorId: post.authorId,
    authorName: post.authorName,
    translations: translationResponse,
    missingLocales: findMissingLocales(translations),
    version: post.version,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    createdById: post.createdById,
    updatedById: post.updatedById,
  };
}

export function toAdminCategory(
  category: PostCategory,
  postCount: number,
): AdminPostCategoryResponse {
  const pick = (locale: Locale) => {
    const translation = category.translations?.find((item) => item.locale === locale);
    return translation ? { name: translation.name, description: translation.description } : null;
  };
  return {
    id: category.id,
    slug: category.slug,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    vi: pick(Locale.VI),
    en: pick(Locale.EN),
    postCount,
    version: category.version,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

// Public output: only the requested locale; an inactive category is hidden from articles
export function toPublicListItem(
  post: Post,
  locale: Locale,
  media: MediaLookup,
): PublicPostListItemResponse {
  const translation = translationOf(post.translations, locale);
  const cover = post.coverImageId ? media.get(post.coverImageId) : undefined;
  const category = post.category?.isActive ? post.category : null;
  return {
    id: post.id,
    slug: post.slug,
    title: translation?.title ?? '',
    excerpt: translation?.excerpt ?? '',
    coverImage: cover ? { url: cover.url, thumbnailUrl: cover.thumbnailUrl } : null,
    category: category ? { slug: category.slug, name: categoryName(category, locale) } : null,
    publishedAt: post.publishedAt as Date,
    updatedAt: post.updatedAt,
    readingTimeMinutes: translation?.readingTimeMinutes ?? 1,
    tags: translation?.tags ?? [],
    isFeatured: post.isFeatured,
  };
}

function toSeo(
  post: Post,
  translation: PostTranslation,
  media: MediaLookup,
): PublicPostSeoResponse {
  const ogImage = translation.ogImageId ? media.get(translation.ogImageId) : undefined;
  const cover = post.coverImageId ? media.get(post.coverImageId) : undefined;
  return {
    title: translation.seoTitle || translation.title,
    description: translation.seoDescription || translation.excerpt,
    keywords:
      translation.seoKeywords || (translation.tags.length ? translation.tags.join(', ') : null),
    canonicalUrl: translation.canonicalUrl,
    noIndex: translation.noIndex,
    ogImageUrl: ogImage?.url ?? cover?.url ?? null,
  };
}

export function toPublicNeighbor(post: Post, locale: Locale): PublicPostNeighborResponse | null {
  const translation = translationOf(post.translations, locale);
  if (!translation || !post.publishedAt) return null;
  return { slug: post.slug, title: translation.title, publishedAt: post.publishedAt };
}

export function toPublicDetail(
  post: Post,
  locale: Locale,
  media: MediaLookup,
  related: PublicPostListItemResponse[],
  previous: PublicPostNeighborResponse | null,
  next: PublicPostNeighborResponse | null,
): PublicPostDetailResponse {
  const translation = translationOf(post.translations, locale) as PostTranslation;
  return {
    ...toPublicListItem(post, locale, media),
    locale,
    contentHtml: translation.contentHtml,
    authorName: post.authorName,
    seo: toSeo(post, translation, media),
    related,
    previous,
    next,
  };
}

export function toPublicCategory(
  category: PostCategory,
  locale: Locale,
  postCount: number,
): PublicPostCategoryResponse {
  const translation = category.translations?.find((item) => item.locale === locale);
  return {
    slug: category.slug,
    name: categoryName(category, locale),
    description: translation?.description ?? null,
    postCount,
  };
}
