// Admin service catalog (/admin/services): service categories with their content
// blocks, plus the shared services overview. Mirrors backend/src/modules/service-catalog.
//
// Repeated blocks are replaced wholesale: a key present in the payload overwrites the
// stored block, a key left out keeps it untouched.

import { api } from "../client";
import type { Locale, PageQuery, Paginated, PaginationMeta } from "../types";

export type ServicePublicationStatus = "draft" | "in_review" | "published" | "archived";

/** Icons a service category itself can use. */
export const SERVICE_ICON_KEYS = ["ai", "cloud", "security", "code"] as const;
export type ServiceIconKey = (typeof SERVICE_ICON_KEYS)[number];

export const SERVICE_ICON_LABELS: Record<ServiceIconKey, string> = {
  ai: "Trí tuệ nhân tạo",
  cloud: "Điện toán đám mây",
  security: "An ninh mạng",
  code: "Phát triển phần mềm",
};

/** Icons the repeated blocks (stats, process steps, why-us, highlights) can use. */
export const CATEGORY_ICON_KEYS = [
  "rocket",
  "trendingUp",
  "clock",
  "users",
  "search",
  "lightbulb",
  "settings",
  "lineChart",
  "briefcase",
  "bolt",
  "shield",
  "headset",
  "eye",
  "target",
  "calendar",
  "globe",
  "heart",
] as const;
export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export const SERVICE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DURATION_LABEL_PATTERN = /^\d{1,3}:[0-5]\d$/;
export const ANCHOR_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED_SERVICE_SLUGS = ["overview", "slugs", "reorder"];

/** Max items per block, mirroring the backend array size caps. */
export const SERVICE_COLLECTION_LIMITS = {
  stats: 12,
  products: 30,
  processSteps: 12,
  whyUs: 12,
  caseStudies: 30,
  testimonials: 20,
  faq: 30,
  highlights: 12,
} as const;

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

export type Translated<T> = Partial<Record<Locale, T>>;
export type TranslatedInput<T> = Partial<Record<Locale, T>>;

export interface ServiceCategoryTranslation {
  title: string | null;
  categoryName: string | null;
  summary: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  productsEyebrow: string | null;
  productsHeading: string | null;
  productsIntro: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  ogImageId: string | null;
  ogImageUrl: string | null;
}

/** Texts that must exist in vi and en before a service can be published. */
export const SERVICE_REQUIRED_TEXT_FIELDS = [
  "title",
  "categoryName",
  "summary",
  "heroTitle",
  "heroSubtitle",
] as const;

export const SERVICE_TEXT_LIMITS = {
  title: 200,
  categoryName: 200,
  summary: 500,
  heroTitle: 300,
  heroSubtitle: 1000,
  productsEyebrow: 150,
  productsHeading: 300,
  productsIntro: 1000,
  seoTitle: 120,
  seoDescription: 320,
  seoKeywords: 500,
  canonicalUrl: 500,
} as const;

// ---------------------------------------------------------------------------
// Repeated blocks
// ---------------------------------------------------------------------------

interface BlockBase {
  id: string;
  sortOrder: number;
}

export interface StatBlock extends BlockBase {
  iconKey: string;
  value: string;
  translations: Translated<{ label: string | null; description: string | null }>;
}

export type ServiceProductLinkType = "product" | "post" | "external" | "none";

export interface ProductBlock extends BlockBase {
  imageId: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  videoDurationSeconds: number | null;
  tags: string[];
  linkType: ServiceProductLinkType;
  linkProductId: string | null;
  linkPostId: string | null;
  linkExternalUrl: string | null;
  translations: Translated<{ name: string | null; description: string | null }>;
}

export interface IconTitleBlock extends BlockBase {
  iconKey: string;
  translations: Translated<{ title: string | null; description: string | null }>;
}

export interface CaseStudyBlock extends BlockBase {
  imageId: string | null;
  imageUrl: string | null;
  durationLabel: string | null;
  tags: string[];
  translations: Translated<{ name: string | null; description: string | null }>;
}

export interface TestimonialBlock extends BlockBase {
  authorName: string;
  avatarId: string | null;
  avatarUrl: string | null;
  translations: Translated<{ quote: string | null; authorRole: string | null }>;
}

export interface FaqBlock extends BlockBase {
  translations: Translated<{ question: string | null; answer: string | null }>;
}

export interface PartnerBannerBlock extends BlockBase {
  imageId: string | null;
  imageUrl: string | null;
  ctaHref: string;
  translations: Translated<{
    label: string | null;
    heading: string | null;
    text: string | null;
    ctaLabel: string | null;
  }>;
}

// Inputs (no id / sortOrder / url — the array order is the sort order)

export interface StatInput {
  iconKey: string;
  value: string;
  translations: TranslatedInput<{ label?: string | null; description?: string | null }>;
}

export interface ProductInput {
  imageId?: string | null;
  videoUrl?: string | null;
  videoDurationSeconds?: number | null;
  tags?: string[];
  linkType: ServiceProductLinkType;
  linkProductId?: string | null;
  linkPostId?: string | null;
  linkExternalUrl?: string | null;
  translations: TranslatedInput<{ name?: string | null; description?: string | null }>;
}

export interface IconTitleInput {
  iconKey: string;
  translations: TranslatedInput<{ title?: string | null; description?: string | null }>;
}

export interface CaseStudyInput {
  imageId?: string | null;
  durationLabel?: string | null;
  tags?: string[];
  translations: TranslatedInput<{ name?: string | null; description?: string | null }>;
}

export interface TestimonialInput {
  authorName: string;
  avatarId?: string | null;
  translations: TranslatedInput<{ quote?: string | null; authorRole?: string | null }>;
}

export interface FaqInput {
  translations: TranslatedInput<{ question?: string | null; answer?: string | null }>;
}

export interface PartnerBannerInput {
  imageId?: string | null;
  /** https url or a site path such as /lien-he. */
  ctaHref: string;
  translations: TranslatedInput<{
    label?: string | null;
    heading?: string | null;
    text?: string | null;
    ctaLabel?: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export interface ServiceCategoryListItem {
  id: string;
  slug: string;
  status: ServicePublicationStatus;
  sortOrder: number;
  iconKey: string;
  titles: { vi: string; en: string };
  coverImageUrl: string | null;
  publishedAt: string | null;
  version: number;
  updatedAt: string;
}

export interface ServiceCategoryDetail {
  id: string;
  slug: string;
  status: ServicePublicationStatus;
  sortOrder: number;
  iconKey: string;
  coverImageId: string | null;
  coverImageUrl: string | null;
  heroImageId: string | null;
  heroImageUrl: string | null;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  translations: Translated<ServiceCategoryTranslation>;
  stats: StatBlock[];
  products: ProductBlock[];
  processSteps: IconTitleBlock[];
  whyUs: IconTitleBlock[];
  caseStudies: CaseStudyBlock[];
  testimonials: TestimonialBlock[];
  faq: FaqBlock[];
  partnerBanner: PartnerBannerBlock | null;
}

export interface ServicesOverview {
  stats: StatBlock[];
  processSteps: IconTitleBlock[];
  highlights: IconTitleBlock[];
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface ServiceCategoryTranslationInput {
  title?: string | null;
  categoryName?: string | null;
  summary?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  productsEyebrow?: string | null;
  productsHeading?: string | null;
  productsIntro?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  ogImageId?: string | null;
}

export interface ServiceCategoryContentInput {
  slug?: string;
  sortOrder?: number;
  coverImageId?: string | null;
  heroImageId?: string | null;
  translations?: TranslatedInput<ServiceCategoryTranslationInput>;
  stats?: StatInput[];
  products?: ProductInput[];
  processSteps?: IconTitleInput[];
  whyUs?: IconTitleInput[];
  caseStudies?: CaseStudyInput[];
  testimonials?: TestimonialInput[];
  faq?: FaqInput[];
  /** null removes the banner. */
  partnerBanner?: PartnerBannerInput | null;
}

export interface CreateServiceCategoryInput extends ServiceCategoryContentInput {
  iconKey: ServiceIconKey;
}

export interface UpdateServiceCategoryInput extends ServiceCategoryContentInput {
  version: number;
  iconKey?: ServiceIconKey;
}

export interface UpdateServicesOverviewInput {
  stats?: StatInput[];
  processSteps?: IconTitleInput[];
  highlights?: IconTitleInput[];
}

export interface ListServiceCategoriesQuery extends PageQuery {
  status?: ServicePublicationStatus;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const BASE = "/admin/services";
const encode = (value: string) => encodeURIComponent(value);

export const serviceCatalogApi = {
  list: async (
    query: ListServiceCategoriesQuery = {},
    signal?: AbortSignal,
  ): Promise<Paginated<ServiceCategoryListItem>> => {
    const result = await api.getWithMeta<ServiceCategoryListItem[], PaginationMeta>(
      BASE,
      { ...query },
      { signal },
    );
    return { items: result.data, meta: result.meta };
  },

  get: (id: string, signal?: AbortSignal): Promise<ServiceCategoryDetail> =>
    api.get<ServiceCategoryDetail>(`${BASE}/${encode(id)}`, undefined, { signal }),

  create: (input: CreateServiceCategoryInput): Promise<ServiceCategoryDetail> =>
    api.post<ServiceCategoryDetail>(BASE, input),

  update: (id: string, input: UpdateServiceCategoryInput): Promise<ServiceCategoryDetail> =>
    api.patch<ServiceCategoryDetail>(`${BASE}/${encode(id)}`, input),

  /** 422 TRANSLATION_MISSING when a required text is empty in vi or en. */
  publish: (id: string): Promise<ServiceCategoryDetail> =>
    api.post<ServiceCategoryDetail>(`${BASE}/${encode(id)}/publish`, {}),

  unpublish: (id: string): Promise<ServiceCategoryDetail> =>
    api.post<ServiceCategoryDetail>(`${BASE}/${encode(id)}/unpublish`, {}),

  archive: (id: string): Promise<ServiceCategoryDetail> =>
    api.post<ServiceCategoryDetail>(`${BASE}/${encode(id)}/archive`, {}),

  remove: (id: string): Promise<void> => api.delete<void>(`${BASE}/${encode(id)}`),

  /** The given ids come first, in this order; every other service keeps its relative order. */
  reorder: (ids: string[]): Promise<string[]> => api.put<string[]>(`${BASE}/reorder`, { ids }),

  getOverview: (signal?: AbortSignal): Promise<ServicesOverview> =>
    api.get<ServicesOverview>(`${BASE}/overview`, undefined, { signal }),

  updateOverview: (input: UpdateServicesOverviewInput): Promise<ServicesOverview> =>
    api.put<ServicesOverview>(`${BASE}/overview`, input),
};

/** ctaHref accepts an http(s) url or a site path; returns a Vietnamese message or null. */
export function describeCtaHrefProblem(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Nhập liên kết cho nút.";
  if (trimmed.length > 500) return "Liên kết quá dài.";
  if (/^\/(?!\/)[^\s\\]*$/.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname) return null;
  } catch {
    /* falls through */
  }
  return "Nhập liên kết http(s) hoặc đường dẫn nội bộ bắt đầu bằng /.";
}
