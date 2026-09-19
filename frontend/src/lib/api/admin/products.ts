// Admin product endpoints — /admin/products.
// Mirrors backend/src/modules/products/dto.

import { api } from "../client";
import type { BillingPeriod, Currency, Locale, PaginationMeta, ProductType } from "../types";
import type { PublicationStatus } from "./posts";

export type { BillingPeriod, Currency, ProductType };
export type DemoMode = "embed" | "external";

export const PRODUCT_TYPES: readonly ProductType[] = [
  "source_code",
  "hosting_plan",
  "live_demo",
  "other",
];
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  source_code: "Mã nguồn",
  hosting_plan: "Gói hosting",
  live_demo: "Bản demo trực tiếp",
  other: "Khác",
};

export const CURRENCIES: readonly Currency[] = ["USD", "VND"];
export const BILLING_PERIODS: readonly BillingPeriod[] = ["one_time", "monthly", "yearly"];
export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  one_time: "Trả một lần",
  monthly: "Hàng tháng",
  yearly: "Hàng năm",
};
export const RECURRING_BILLING_PERIODS: readonly BillingPeriod[] = ["monthly", "yearly"];

export interface AdminProductPrice {
  id: string;
  currency: Currency;
  amount: string;
  billingPeriod: BillingPeriod;
  isDefault: boolean;
}

export interface ProductPriceInput {
  currency: Currency;
  /** Positive decimal string with at most 2 decimals. */
  amount: string;
  billingPeriod: BillingPeriod;
  isDefault?: boolean;
}

export interface AdminProductListItem {
  id: string;
  slug: string;
  type: ProductType;
  status: PublicationStatus;
  sku: string | null;
  isFeatured: boolean;
  priceOnRequest: boolean;
  categoryId: string | null;
  names: Partial<Record<Locale, string | null>>;
  missingLocales: string[];
  coverImageUrl: string | null;
  prices: AdminProductPrice[];
  publishedAt: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface AdminGalleryItem {
  mediaAssetId: string;
  url: string | null;
  sortOrder: number;
}

export interface AdminProductTranslation {
  name: string;
  tagline: string | null;
  descriptionHtml: string | null;
  features: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  ogImageId: string | null;
}

export interface AdminProductDetail extends AdminProductListItem {
  coverImageId: string | null;
  gallery: AdminGalleryItem[];
  demoUrl: string | null;
  demoMode: DemoMode;
  techStack: string[];
  specifications: Record<string, string | number>;
  sortOrder: number;
  createdById: string | null;
  translations: Partial<Record<Locale, AdminProductTranslation>>;
}

export interface ProductTranslationInput {
  name?: string;
  tagline?: string | null;
  descriptionHtml?: string | null;
  features?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  ogImageId?: string | null;
}

export interface CreateProductInput {
  slug?: string;
  type: ProductType;
  sku?: string | null;
  categoryId?: string | null;
  coverImageId?: string | null;
  galleryImageIds?: string[];
  demoUrl?: string | null;
  demoMode?: DemoMode;
  techStack?: string[];
  specifications?: Record<string, string | number>;
  priceOnRequest?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  prices?: ProductPriceInput[];
  /** `vi.name` is required on create. */
  translations: { vi: ProductTranslationInput & { name: string }; en?: ProductTranslationInput };
}

export interface UpdateProductInput extends Partial<Omit<CreateProductInput, "translations">> {
  version: number;
  translations?: Partial<Record<Locale, ProductTranslationInput>>;
}

export interface ListProductsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  status?: PublicationStatus;
  type?: ProductType;
  categoryId?: string;
  featured?: boolean;
  missingLocale?: Locale;
}

export interface ProductsPage {
  items: AdminProductListItem[];
  meta: PaginationMeta;
}

export const PRODUCT_LIMITS = {
  slug: 200,
  sku: 64,
  name: 200,
  tagline: 300,
  descriptionHtml: 100000,
  features: 30,
  featureLength: 300,
  techStack: 30,
  techLength: 50,
  gallery: 20,
  prices: 12,
  demoUrl: 500,
  seoTitle: 120,
  seoDescription: 320,
  seoKeywords: 500,
  canonicalUrl: 500,
} as const;

const BASE = "/admin/products";

function path(id: string, suffix = ""): string {
  return `${BASE}/${encodeURIComponent(id)}${suffix}`;
}

export const productsApi = {
  list: async (query: ListProductsQuery = {}): Promise<ProductsPage> => {
    const result = await api.getWithMeta<AdminProductListItem[], PaginationMeta>(BASE, {
      ...query,
    });
    return { items: result.data, meta: result.meta };
  },
  get: (id: string, signal?: AbortSignal): Promise<AdminProductDetail> =>
    api.get<AdminProductDetail>(path(id), undefined, { signal }),
  create: (input: CreateProductInput): Promise<AdminProductDetail> =>
    api.post<AdminProductDetail>(BASE, input),
  /** Prices and gallery use replace-all semantics. */
  update: (id: string, input: UpdateProductInput): Promise<AdminProductDetail> =>
    api.patch<AdminProductDetail>(path(id), input),
  submitForReview: (id: string, version?: number): Promise<AdminProductDetail> =>
    api.post<AdminProductDetail>(path(id, "/submit-for-review"), { version }),
  publish: (id: string, options: { version?: number; publishedAt?: string } = {}) =>
    api.post<AdminProductDetail>(path(id, "/publish"), options),
  /** Also serves as "send back to draft" and "restore from archive". */
  unpublish: (id: string, version?: number): Promise<AdminProductDetail> =>
    api.post<AdminProductDetail>(path(id, "/unpublish"), { version }),
  archive: (id: string, version?: number): Promise<AdminProductDetail> =>
    api.post<AdminProductDetail>(path(id, "/archive"), { version }),
  remove: (id: string): Promise<void> => api.delete<void>(path(id)),
};
