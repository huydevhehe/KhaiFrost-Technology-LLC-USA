// Admin article (bài viết) endpoints — /admin/posts.
// Mirrors backend/src/modules/posts/dto.

import { api } from "../client";
import type { Locale, PaginationMeta } from "../types";

export type PublicationStatus = "draft" | "in_review" | "published" | "archived";

export interface MediaReference {
  id: string;
  url: string;
  thumbnailUrl: string;
}

export interface LocalizedTitles {
  vi: string | null;
  en: string | null;
}

export interface AdminPostCategoryReference {
  id: string;
  slug: string;
  name: string;
}

export interface AdminPostListItem {
  id: string;
  slug: string;
  status: PublicationStatus;
  isFeatured: boolean;
  title: string;
  titles: LocalizedTitles;
  category: AdminPostCategoryReference | null;
  coverThumbnailUrl: string | null;
  authorId: string | null;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  missingLocales: Locale[];
}

export interface AdminPostTranslation {
  title: string;
  excerpt: string;
  contentHtml: string;
  tags: string[];
  readingTimeMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  ogImage: MediaReference | null;
}

export interface AdminPostCategoryNames {
  id: string;
  slug: string;
  names: LocalizedTitles;
}

export interface AdminPostDetail {
  id: string;
  slug: string;
  status: PublicationStatus;
  isFeatured: boolean;
  publishedAt: string | null;
  category: AdminPostCategoryNames | null;
  coverImage: MediaReference | null;
  authorId: string | null;
  authorName: string;
  translations: Partial<Record<Locale, AdminPostTranslation | null>>;
  missingLocales: Locale[];
  version: number;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
}

/** Every field is optional: only what is sent is changed. */
export interface PostTranslationInput {
  title?: string;
  excerpt?: string;
  contentHtml?: string;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  ogImageId?: string | null;
}

export type PostTranslationsInput = Partial<Record<Locale, PostTranslationInput>>;

export interface CreatePostInput {
  slug?: string;
  translations: PostTranslationsInput;
  categoryId?: string | null;
  coverImageId?: string | null;
  isFeatured?: boolean;
  authorName?: string;
}

export interface UpdatePostInput {
  version: number;
  slug?: string;
  translations?: PostTranslationsInput;
  categoryId?: string | null;
  coverImageId?: string | null;
  isFeatured?: boolean;
  authorName?: string;
  /** ISO string; needs post:publish. */
  publishedAt?: string;
}

export interface ListPostsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  status?: PublicationStatus;
  categoryId?: string;
  authorId?: string;
  isFeatured?: boolean;
  dateField?: "updatedAt" | "publishedAt";
  dateFrom?: string;
  dateTo?: string;
  missingLocale?: Locale;
  locale?: Locale;
}

export interface PostsPage {
  items: AdminPostListItem[];
  meta: PaginationMeta;
}

/** Max lengths enforced by the backend DTO. */
export const POST_LIMITS = {
  slug: 200,
  title: 255,
  excerpt: 600,
  contentHtml: 200000,
  tags: 20,
  tagLength: 50,
  authorName: 150,
  seoTitle: 120,
  seoDescription: 320,
  seoKeywords: 500,
  canonicalUrl: 500,
} as const;

const BASE = "/admin/posts";

function path(id: string, suffix = ""): string {
  return `${BASE}/${encodeURIComponent(id)}${suffix}`;
}

export const postsApi = {
  list: async (query: ListPostsQuery = {}): Promise<PostsPage> => {
    const result = await api.getWithMeta<AdminPostListItem[], PaginationMeta>(BASE, { ...query });
    return { items: result.data, meta: result.meta };
  },
  get: (id: string, signal?: AbortSignal): Promise<AdminPostDetail> =>
    api.get<AdminPostDetail>(path(id), undefined, { signal }),
  create: (input: CreatePostInput): Promise<AdminPostDetail> =>
    api.post<AdminPostDetail>(BASE, input),
  update: (id: string, input: UpdatePostInput): Promise<AdminPostDetail> =>
    api.patch<AdminPostDetail>(path(id), input),
  submitForReview: (id: string): Promise<AdminPostDetail> =>
    api.post<AdminPostDetail>(path(id, "/submit-for-review")),
  /** A future `publishedAt` schedules the post. */
  publish: (id: string, publishedAt?: string): Promise<AdminPostDetail> =>
    api.post<AdminPostDetail>(path(id, "/publish"), publishedAt ? { publishedAt } : {}),
  unpublish: (id: string): Promise<AdminPostDetail> =>
    api.post<AdminPostDetail>(path(id, "/unpublish")),
  archive: (id: string): Promise<AdminPostDetail> =>
    api.post<AdminPostDetail>(path(id, "/archive")),
  restore: (id: string): Promise<AdminPostDetail> =>
    api.post<AdminPostDetail>(path(id, "/restore")),
  /** Soft delete. */
  remove: (id: string): Promise<void> => api.delete<void>(path(id)),
};
