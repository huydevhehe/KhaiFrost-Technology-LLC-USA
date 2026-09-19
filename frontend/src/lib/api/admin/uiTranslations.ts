// Admin interface texts (/admin/ui-translations).
// Mirrors backend/src/modules/ui-translations.

import { api } from "../client";
import type { Locale, PageQuery, Paginated, PaginationMeta } from "../types";

export type MissingLocaleFilter = "vi" | "en" | "any";

export interface UiTranslation {
  id: string;
  namespace: string;
  key: string;
  valueVi: string | null;
  valueEn: string | null;
  description: string | null;
  isSystem: boolean;
  /** Locales that have no text yet. */
  missingLocales: Locale[];
  version: number;
  updatedAt: string;
}

export interface UiTranslationNamespaceSummary {
  namespace: string;
  total: number;
  missingVi: number;
  missingEn: number;
}

export interface ListUiTranslationsQuery extends PageQuery {
  namespace?: string;
  missing?: MissingLocaleFilter;
}

export interface CreateUiTranslationInput {
  namespace: string;
  /** Dot separated path, e.g. `hero.headline`. */
  key: string;
  valueVi?: string | null;
  valueEn?: string | null;
  description?: string | null;
}

export interface UpdateUiTranslationInput {
  version: number;
  valueVi?: string | null;
  valueEn?: string | null;
  description?: string | null;
}

export interface ImportBundleInput {
  locale: Locale;
  /** Nested i18next JSON for ONE namespace. */
  bundle: Record<string, unknown>;
  namespace?: string;
  overwrite?: boolean;
}

export interface ImportBundleResult {
  created: number;
  updated: number;
  skipped: number;
  conflicts: string[];
  /** Keys whose vi and en placeholders differ. */
  placeholderMismatches: string[];
}

export const UI_TRANSLATION_VALUE_MAX_LENGTH = 5000;
export const UI_TRANSLATION_DESCRIPTION_MAX_LENGTH = 500;
export const UI_TRANSLATION_NAMESPACE_PATTERN = /^[A-Za-z0-9_-]+$/;
export const UI_TRANSLATION_KEY_PATTERN = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;
export const DEFAULT_UI_NAMESPACE = "translation";

const BASE = "/admin/ui-translations";
const encode = (value: string) => encodeURIComponent(value);

export const uiTranslationsApi = {
  list: async (
    query: ListUiTranslationsQuery = {},
    signal?: AbortSignal,
  ): Promise<Paginated<UiTranslation>> => {
    const result = await api.getWithMeta<UiTranslation[], PaginationMeta>(BASE, { ...query }, { signal });
    return { items: result.data, meta: result.meta };
  },

  namespaces: (signal?: AbortSignal): Promise<UiTranslationNamespaceSummary[]> =>
    api.get<UiTranslationNamespaceSummary[]>(`${BASE}/namespaces`, undefined, { signal }),

  create: (input: CreateUiTranslationInput): Promise<UiTranslation> =>
    api.post<UiTranslation>(BASE, input),

  update: (id: string, input: UpdateUiTranslationInput): Promise<UiTranslation> =>
    api.patch<UiTranslation>(`${BASE}/${encode(id)}`, input),

  /** System texts are protected (409 SYSTEM_RESOURCE_PROTECTED). */
  remove: (id: string): Promise<void> => api.delete<void>(`${BASE}/${encode(id)}`),

  importBundle: (input: ImportBundleInput): Promise<ImportBundleResult> =>
    api.post<ImportBundleResult>(`${BASE}/import`, input),
};

const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;

/** The `{{placeholder}}` names used in a text, sorted. */
export function placeholdersOf(value: string | null | undefined): string[] {
  if (!value) return [];
  const found = new Set<string>();
  for (const match of value.matchAll(PLACEHOLDER_PATTERN)) found.add(match[1]);
  return [...found].sort();
}

/** True when vi and en use exactly the same placeholders (empty texts are ignored). */
export function placeholdersMatch(vi: string | null | undefined, en: string | null | undefined): boolean {
  if (!vi?.trim() || !en?.trim()) return true;
  const a = placeholdersOf(vi);
  const b = placeholdersOf(en);
  return a.length === b.length && a.every((name, index) => name === b[index]);
}
