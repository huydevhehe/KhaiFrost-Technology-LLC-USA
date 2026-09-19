// Admin project category endpoints — /admin/project-categories.

import { api } from "../client";
import type { Locale } from "../types";

export interface ProjectCategory {
  id: string;
  slug: string;
  sortOrder: number;
  version: number;
  translations: Partial<Record<Locale, { name: string }>>;
}

export interface CreateProjectCategoryInput {
  slug?: string;
  sortOrder?: number;
  /** Both locales are required. */
  translations: Record<Locale, { name: string }>;
}

export interface UpdateProjectCategoryInput {
  version: number;
  slug?: string;
  sortOrder?: number;
  translations?: Partial<Record<Locale, { name?: string | null }>>;
}

export const PROJECT_CATEGORY_LIMITS = { slug: 200, name: 150 } as const;

const BASE = "/admin/project-categories";

export const projectCategoriesApi = {
  list: (signal?: AbortSignal): Promise<ProjectCategory[]> =>
    api.get<ProjectCategory[]>(BASE, undefined, { signal }),
  get: (id: string): Promise<ProjectCategory> =>
    api.get<ProjectCategory>(`${BASE}/${encodeURIComponent(id)}`),
  create: (input: CreateProjectCategoryInput): Promise<ProjectCategory> =>
    api.post<ProjectCategory>(BASE, input),
  update: (id: string, input: UpdateProjectCategoryInput): Promise<ProjectCategory> =>
    api.patch<ProjectCategory>(`${BASE}/${encodeURIComponent(id)}`, input),
  /** 409 CONFLICT while projects still use it. */
  remove: (id: string): Promise<void> => api.delete<void>(`${BASE}/${encodeURIComponent(id)}`),
};
