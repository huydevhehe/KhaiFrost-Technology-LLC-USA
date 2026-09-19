// Admin product category endpoints — /admin/product-categories.

import { api } from "../client";
import type { Locale } from "../types";

export interface AdminProductCategoryTranslation {
  name: string;
  description: string | null;
}

export interface AdminProductCategory {
  id: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  translations: Partial<Record<Locale, AdminProductCategoryTranslation>>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategoryTranslationInput {
  name: string;
  description?: string | null;
}

export interface CreateProductCategoryInput {
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  translations: Record<Locale, ProductCategoryTranslationInput>;
}

export interface UpdateProductCategoryInput {
  version: number;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  translations?: Partial<Record<Locale, Partial<ProductCategoryTranslationInput>>>;
}

export const PRODUCT_CATEGORY_LIMITS = { slug: 200, name: 200, description: 1000 } as const;

const BASE = "/admin/product-categories";

export const productCategoriesApi = {
  list: (signal?: AbortSignal): Promise<AdminProductCategory[]> =>
    api.get<AdminProductCategory[]>(BASE, undefined, { signal }),
  get: (id: string): Promise<AdminProductCategory> =>
    api.get<AdminProductCategory>(`${BASE}/${encodeURIComponent(id)}`),
  create: (input: CreateProductCategoryInput): Promise<AdminProductCategory> =>
    api.post<AdminProductCategory>(BASE, input),
  update: (id: string, input: UpdateProductCategoryInput): Promise<AdminProductCategory> =>
    api.patch<AdminProductCategory>(`${BASE}/${encodeURIComponent(id)}`, input),
  /** 409 CATEGORY_IN_USE while products still reference it. */
  remove: (id: string): Promise<void> => api.delete<void>(`${BASE}/${encodeURIComponent(id)}`),
};
