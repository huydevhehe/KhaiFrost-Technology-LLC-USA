// Admin post category endpoints — /admin/post-categories.

import { api } from "../client";
import type { Locale } from "../types";

export interface AdminPostCategoryTranslation {
  name: string;
  description: string | null;
}

export interface AdminPostCategory {
  id: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  vi: AdminPostCategoryTranslation | null;
  en: AdminPostCategoryTranslation | null;
  /** Non-deleted posts that use this category. */
  postCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostCategoryTranslationInput {
  name: string;
  description?: string | null;
}

/** Both locales are required by the backend. */
export type PostCategoryTranslationsInput = Record<Locale, PostCategoryTranslationInput>;

export interface CreatePostCategoryInput {
  slug?: string;
  translations: PostCategoryTranslationsInput;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdatePostCategoryInput {
  version: number;
  slug?: string;
  translations?: PostCategoryTranslationsInput;
  sortOrder?: number;
  isActive?: boolean;
}

export const POST_CATEGORY_LIMITS = { slug: 200, name: 150, description: 500 } as const;

const BASE = "/admin/post-categories";

export const postCategoriesApi = {
  list: (signal?: AbortSignal): Promise<AdminPostCategory[]> =>
    api.get<AdminPostCategory[]>(BASE, undefined, { signal }),
  get: (id: string): Promise<AdminPostCategory> =>
    api.get<AdminPostCategory>(`${BASE}/${encodeURIComponent(id)}`),
  create: (input: CreatePostCategoryInput): Promise<AdminPostCategory> =>
    api.post<AdminPostCategory>(BASE, input),
  update: (id: string, input: UpdatePostCategoryInput): Promise<AdminPostCategory> =>
    api.patch<AdminPostCategory>(`${BASE}/${encodeURIComponent(id)}`, input),
  /** 409 CATEGORY_IN_USE while posts still reference it. */
  remove: (id: string): Promise<void> => api.delete<void>(`${BASE}/${encodeURIComponent(id)}`),
};
