import { usePublicDataState } from "./store";
import type { BillingPeriod, Currency, ProductType } from "@/lib/api/types";

export type DemoMode = "embed" | "external";

export interface ProductPrice {
  currency: Currency;
  amount: string;
  billingPeriod: BillingPeriod;
  isDefault: boolean;
}

export interface ProductDemo {
  url: string;
  mode: DemoMode;
}

export interface ProductSeo {
  title: string;
  description: string | null;
  keywords: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  ogImageUrl: string | null;
}

export interface ProductCategoryRef {
  slug: string;
  name: string;
}

export interface ProductCardSummary {
  id: string;
  slug: string;
  type: ProductType;
  name: string;
  tagline: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  priceOnRequest: boolean;
  hasDemo: boolean;
  prices: ProductPrice[];
}

export interface PublicProductDetail extends ProductCardSummary {
  descriptionHtml: string | null;
  features: string[];
  galleryUrls: string[];
  techStack: string[];
  specifications: Record<string, string | number>;
  demo: ProductDemo | null;
  category: ProductCategoryRef | null;
  publishedAt: string | null;
  seo: ProductSeo;
  related: ProductCardSummary[];
}

/** Reads a single product by slug for the current UI locale; `notFound` is true once the request has settled with no data. */
export function useProductDetail(slug: string): { product: PublicProductDetail | undefined; notFound: boolean } {
  const { data, failed } = usePublicDataState<PublicProductDetail>(`/public/products/${encodeURIComponent(slug)}`);
  return { product: data, notFound: failed };
}
