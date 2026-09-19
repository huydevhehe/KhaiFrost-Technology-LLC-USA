// Admin page builder endpoints (/admin/pages).
// Mirrors backend/src/modules/pages (controllers, DTOs and the section type registry).

import { api } from "../client";
import type { Locale, PageQuery, Paginated, PaginationMeta } from "../types";

// ---------------------------------------------------------------------------
// Section type registry (GET /admin/pages/section-types)
// ---------------------------------------------------------------------------

export type SectionFieldKind =
  | "text"
  | "textarea"
  | "richtext"
  | "url"
  | "media"
  | "number"
  | "boolean"
  | "select"
  | "list";

export interface LocalizedLabel {
  vi: string;
  en: string;
}

export interface SectionFieldDefinition {
  key: string;
  kind: SectionFieldKind;
  label: LocalizedLabel;
  /** Only text, textarea and richtext can be translated; anything else lives in `shared`. */
  translatable: boolean;
  required: boolean;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  options?: string[];
  urlPolicy?: "web" | "https-video";
  /** Sibling translatable field used as the alt text of a media field. */
  altFieldKey?: string;
  itemFields?: SectionFieldDefinition[];
  minItems?: number;
  maxItems?: number;
}

export interface SectionTypeDefinition {
  type: string;
  label: LocalizedLabel;
  description: LocalizedLabel;
  fields: SectionFieldDefinition[];
}

/** `{ shared: {...}, translations: { vi: {...}, en: {...} } }` as the validator expects it. */
export interface SectionContent {
  shared: Record<string, unknown>;
  translations: Partial<Record<Locale, Record<string, unknown>>>;
}

/** One row of a list field in `shared` (always carries a stable `id`). */
export interface SectionListItem extends Record<string, unknown> {
  id: string;
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export type PageStatus = "draft" | "published";

export interface PageSummary {
  id: string;
  path: string;
  templateKey: string;
  status: PageStatus;
  isSystem: boolean;
  title: { vi: string | null; en: string | null };
  publishedAt: string | null;
  currentRevisionNumber: number;
  sectionCount: number;
  /** A visible section holds draft content that is not live yet. */
  hasUnpublishedChanges: boolean;
  version: number;
  updatedAt: string;
}

export interface PageSection {
  id: string;
  sectionKey: string;
  type: string;
  sortOrder: number;
  isVisible: boolean;
  isSystem: boolean;
  version: number;
  draftContent: SectionContent;
  publishedContent: SectionContent | null;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
}

export interface PageTranslation {
  title: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  ogImageId: string | null;
}

export interface PageDetail extends PageSummary {
  translations: Partial<Record<Locale, PageTranslation>>;
  sections: PageSection[];
  /** Field schemas of the section types used on this page. */
  sectionTypes: Record<string, SectionTypeDefinition>;
}

export interface PageRevisionSummary {
  id: string;
  revisionNumber: number;
  note: string | null;
  createdById: string | null;
  createdAt: string;
  sectionCount: number;
}

export interface PageRevisionSnapshot {
  page: { path: string; templateKey: string };
  translations: Record<string, Partial<PageTranslation>>;
  sections: {
    sectionKey: string;
    type: string;
    sortOrder: number;
    isVisible: boolean;
    isSystem: boolean;
    content: SectionContent;
  }[];
}

export interface PageRevisionDetail extends PageRevisionSummary {
  snapshot: PageRevisionSnapshot;
}

export interface ResolvedMedia {
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
}

export interface PreviewSection {
  key: string;
  type: string;
  /** Fields flattened to the requested locale (media become objects). */
  content: Record<string, unknown>;
}

export interface PagePreview {
  path: string;
  templateKey: string;
  locale: Locale;
  title: string | null;
  seo: Record<string, unknown>;
  publishedAt: string | null;
  updatedAt: string;
  sections: PreviewSection[];
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export interface PageTranslationInput {
  title?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  ogImageId?: string | null;
}

export type PageTranslationsInput = Partial<Record<Locale, PageTranslationInput>>;

export interface CreatePageInput {
  path: string;
  templateKey?: string;
  /** `vi.title` is mandatory. */
  translations: PageTranslationsInput;
}

export interface UpdatePageInput {
  version: number;
  path?: string;
  templateKey?: string;
  translations?: PageTranslationsInput;
}

export interface CreateSectionInput {
  type: string;
  sectionKey?: string;
  isVisible?: boolean;
  sortOrder?: number;
  content?: SectionContent;
}

export interface UpdateSectionInput {
  version: number;
  isVisible?: boolean;
  sortOrder?: number;
  /** Replaces the whole draft content. */
  content?: SectionContent;
}

export interface ListPagesQuery extends PageQuery {
  status?: PageStatus;
}

// ---------------------------------------------------------------------------
// Limits mirrored from the backend so the client can validate first
// ---------------------------------------------------------------------------

export const PAGE_PATH_MAX_LENGTH = 200;
export const PAGE_TITLE_MAX_LENGTH = 200;
export const SEO_TITLE_MAX_LENGTH = 120;
export const SEO_DESCRIPTION_MAX_LENGTH = 320;
export const SEO_KEYWORDS_MAX_LENGTH = 500;
export const CANONICAL_URL_MAX_LENGTH = 500;
/** Recommended lengths shown by the SEO character counters. */
export const SEO_TITLE_RECOMMENDED = 60;
export const SEO_DESCRIPTION_RECOMMENDED = 160;

export const RESERVED_PATH_PREFIXES = [
  "admin",
  "api",
  "login",
  "register",
  "account",
  "uploads",
  "_next",
] as const;

const PATH_SEGMENT_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Vietnamese description of why a page path is invalid, or null when it is fine. */
export function describePagePathProblem(path: string): string | null {
  if (path === "/") return null;
  if (path.length > PAGE_PATH_MAX_LENGTH)
    return `Đường dẫn tối đa ${PAGE_PATH_MAX_LENGTH} ký tự.`;
  if (!path.startsWith("/")) return "Đường dẫn phải bắt đầu bằng dấu /.";
  const segments = path.slice(1).split("/");
  if (segments.length > 5) return "Đường dẫn tối đa 5 cấp.";
  if (!segments.every((segment) => PATH_SEGMENT_PATTERN.test(segment))) {
    return "Mỗi đoạn đường dẫn chỉ gồm chữ thường, số và dấu gạch ngang (vd /gioi-thieu).";
  }
  if ((RESERVED_PATH_PREFIXES as readonly string[]).includes(segments[0])) {
    return `Đường dẫn không được bắt đầu bằng: ${RESERVED_PATH_PREFIXES.join(", ")}.`;
  }
  return null;
}

const VIDEO_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "vimeo.com",
];

/** Mirrors the backend url rules: http(s) absolute, or a relative path / anchor. */
export function describeUrlProblem(
  value: string,
  policy: "web" | "https-video" = "web",
): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > 2000) return "Liên kết quá dài.";
  let parsed: URL | null = null;
  try {
    parsed = /\s/.test(trimmed) ? null : new URL(trimmed);
  } catch {
    parsed = null;
  }
  if (policy === "https-video") {
    if (!parsed || parsed.protocol !== "https:" || !VIDEO_HOSTS.includes(parsed.hostname.toLowerCase())) {
      return "Chỉ chấp nhận liên kết https của YouTube hoặc Vimeo.";
    }
    return null;
  }
  if (parsed && (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname) {
    return null;
  }
  if (/^\/(?!\/)[^\s\\]*$/.test(trimmed) || /^#[^\s]*$/.test(trimmed)) return null;
  return "Nhập liên kết http(s) hoặc đường dẫn nội bộ bắt đầu bằng /.";
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const BASE = "/admin/pages";
const encode = (value: string) => encodeURIComponent(value);

export const pagesApi = {
  list: async (query: ListPagesQuery = {}, signal?: AbortSignal): Promise<Paginated<PageSummary>> => {
    const result = await api.getWithMeta<PageSummary[], PaginationMeta>(BASE, { ...query }, { signal });
    return { items: result.data, meta: result.meta };
  },

  sectionTypes: (signal?: AbortSignal): Promise<SectionTypeDefinition[]> =>
    api.get<SectionTypeDefinition[]>(`${BASE}/section-types`, undefined, { signal }),

  get: (id: string, signal?: AbortSignal): Promise<PageDetail> =>
    api.get<PageDetail>(`${BASE}/${encode(id)}`, undefined, { signal }),

  create: (input: CreatePageInput): Promise<PageDetail> => api.post<PageDetail>(BASE, input),

  update: (id: string, input: UpdatePageInput): Promise<PageDetail> =>
    api.patch<PageDetail>(`${BASE}/${encode(id)}`, input),

  /** System pages are protected (409 SYSTEM_RESOURCE_PROTECTED). */
  remove: (id: string): Promise<void> => api.delete<void>(`${BASE}/${encode(id)}`),

  addSection: (id: string, input: CreateSectionInput): Promise<PageSection> =>
    api.post<PageSection>(`${BASE}/${encode(id)}/sections`, input),

  reorderSections: (id: string, sectionIds: string[]): Promise<PageSection[]> =>
    api.post<PageSection[]>(`${BASE}/${encode(id)}/sections/reorder`, { sectionIds }),

  updateSection: (id: string, sectionId: string, input: UpdateSectionInput): Promise<PageSection> =>
    api.patch<PageSection>(`${BASE}/${encode(id)}/sections/${encode(sectionId)}`, input),

  removeSection: (id: string, sectionId: string): Promise<void> =>
    api.delete<void>(`${BASE}/${encode(id)}/sections/${encode(sectionId)}`),

  /** 400 VALIDATION_FAILED lists missing required fields, 422 TRANSLATION_MISSING missing locales. */
  publish: (id: string, note?: string): Promise<PageDetail> =>
    api.post<PageDetail>(`${BASE}/${encode(id)}/publish`, note ? { note } : {}),

  unpublish: (id: string): Promise<PageDetail> =>
    api.post<PageDetail>(`${BASE}/${encode(id)}/unpublish`, {}),

  discardDraft: (id: string): Promise<PageDetail> =>
    api.post<PageDetail>(`${BASE}/${encode(id)}/discard-draft`, {}),

  revisions: async (
    id: string,
    query: { page?: number; pageSize?: number } = {},
    signal?: AbortSignal,
  ): Promise<Paginated<PageRevisionSummary>> => {
    const result = await api.getWithMeta<PageRevisionSummary[], PaginationMeta>(
      `${BASE}/${encode(id)}/revisions`,
      { ...query },
      { signal },
    );
    return { items: result.data, meta: result.meta };
  },

  revision: (id: string, revisionNumber: number, signal?: AbortSignal): Promise<PageRevisionDetail> =>
    api.get<PageRevisionDetail>(`${BASE}/${encode(id)}/revisions/${revisionNumber}`, undefined, { signal }),

  /** Restores the snapshot as draft content; nothing goes live until the page is published again. */
  revert: (id: string, revisionNumber: number, note?: string): Promise<PageDetail> =>
    api.post<PageDetail>(`${BASE}/${encode(id)}/revisions/${revisionNumber}/revert`, note ? { note } : {}),

  preview: (id: string, locale: Locale, signal?: AbortSignal): Promise<PagePreview> =>
    api.get<PagePreview>(`${BASE}/${encode(id)}/preview`, { locale }, { signal }),
};
