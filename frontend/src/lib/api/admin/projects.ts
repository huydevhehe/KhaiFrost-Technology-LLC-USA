// Admin project endpoints — /admin/projects.
// Mirrors backend/src/modules/projects/dto.

import { api } from "../client";
import type { Locale, PaginationMeta } from "../types";
import type { PublicationStatus } from "./posts";

export interface ProjectListItem {
  id: string;
  slug: string;
  status: PublicationStatus;
  featured: boolean;
  sortOrder: number;
  categoryId: string | null;
  thumbnailUrl: string | null;
  titles: { vi: string; en: string };
  createdById: string | null;
  version: number;
  updatedAt: string;
}

export interface ProjectTranslation {
  title: string;
  summary: string;
  descriptionHtml: string;
  industry: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  ogImageId: string | null;
  ogImageUrl: string | null;
}

export interface ProjectSectionTranslation {
  heading: string;
  bodyHtml: string;
}

export interface ProjectSection {
  translations: Partial<Record<Locale, ProjectSectionTranslation>>;
}

export interface ProjectGalleryItem {
  mediaAssetId: string;
  url: string | null;
  sortOrder: number;
}

export interface ProjectDetail {
  id: string;
  slug: string;
  status: PublicationStatus;
  featured: boolean;
  sortOrder: number;
  categoryId: string | null;
  thumbnailId: string | null;
  thumbnailUrl: string | null;
  clientName: string | null;
  technologies: string[];
  demoUrl: string | null;
  videoUrl: string | null;
  hasVideo: boolean;
  videoDuration: string | null;
  /** YYYY-MM-DD. */
  completedAt: string | null;
  publishedAt: string | null;
  gallery: ProjectGalleryItem[];
  sections: ProjectSection[];
  translations: Partial<Record<Locale, ProjectTranslation>>;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
}

export interface ProjectTranslationInput {
  title?: string | null;
  summary?: string | null;
  descriptionHtml?: string | null;
  industry?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  ogImageId?: string | null;
}

export interface ProjectSectionInput {
  translations: Partial<Record<Locale, { heading?: string | null; bodyHtml?: string | null }>>;
}

export interface ProjectContentInput {
  slug?: string;
  categoryId?: string | null;
  thumbnailId?: string | null;
  /** Replace-all, in display order. */
  galleryMediaIds?: string[];
  clientName?: string | null;
  technologies?: string[];
  /** Absolute http(s) URL or an on-site path like /lien-he. */
  demoUrl?: string | null;
  videoUrl?: string | null;
  hasVideo?: boolean;
  /** "02:32". */
  videoDuration?: string | null;
  /** YYYY-MM-DD. */
  completedAt?: string | null;
  /** Needs project:update-any. */
  featured?: boolean;
  /** Needs project:update-any. */
  sortOrder?: number;
  translations?: Partial<Record<Locale, ProjectTranslationInput>>;
  /** Replace-all. */
  sections?: ProjectSectionInput[];
}

export type CreateProjectInput = ProjectContentInput;
export interface UpdateProjectInput extends ProjectContentInput {
  version: number;
}

export interface ListProjectsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  status?: PublicationStatus;
  categoryId?: string;
  featured?: boolean;
  mine?: boolean;
}

export interface ProjectsPage {
  items: ProjectListItem[];
  meta: PaginationMeta;
}

export const PROJECT_LIMITS = {
  slug: 200,
  title: 200,
  summary: 600,
  descriptionHtml: 50000,
  industry: 150,
  clientName: 150,
  technologies: 20,
  technologyLength: 50,
  gallery: 30,
  sections: 20,
  sectionHeading: 200,
  sectionBodyHtml: 20000,
  demoUrl: 500,
  videoUrl: 500,
  seoTitle: 120,
  seoDescription: 320,
  seoKeywords: 500,
  canonicalUrl: 500,
} as const;

/** "02:32" style duration accepted by the backend. */
export const PROJECT_DURATION_PATTERN = /^\d{1,3}:[0-5]\d$/;

const BASE = "/admin/projects";

function path(id: string, suffix = ""): string {
  return `${BASE}/${encodeURIComponent(id)}${suffix}`;
}

export const projectsApi = {
  list: async (query: ListProjectsQuery = {}): Promise<ProjectsPage> => {
    const result = await api.getWithMeta<ProjectListItem[], PaginationMeta>(BASE, { ...query });
    return { items: result.data, meta: result.meta };
  },
  get: (id: string, signal?: AbortSignal): Promise<ProjectDetail> =>
    api.get<ProjectDetail>(path(id), undefined, { signal }),
  create: (input: CreateProjectInput): Promise<ProjectDetail> =>
    api.post<ProjectDetail>(BASE, input),
  update: (id: string, input: UpdateProjectInput): Promise<ProjectDetail> =>
    api.patch<ProjectDetail>(path(id), input),
  submitForReview: (id: string): Promise<ProjectDetail> =>
    api.post<ProjectDetail>(path(id, "/submit-for-review")),
  /** In review → draft. */
  reject: (id: string): Promise<ProjectDetail> => api.post<ProjectDetail>(path(id, "/reject")),
  publish: (id: string): Promise<ProjectDetail> => api.post<ProjectDetail>(path(id, "/publish")),
  unpublish: (id: string): Promise<ProjectDetail> =>
    api.post<ProjectDetail>(path(id, "/unpublish")),
  archive: (id: string): Promise<ProjectDetail> => api.post<ProjectDetail>(path(id, "/archive")),
  /** Needs project:update-any; returns the full order. */
  reorder: (ids: string[]): Promise<string[]> => api.put<string[]>(`${BASE}/reorder`, { ids }),
  remove: (id: string): Promise<void> => api.delete<void>(path(id)),
};
