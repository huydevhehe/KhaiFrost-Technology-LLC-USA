import { api } from "../client";
import type { AdminSearchResult, AdminSearchType } from "../types";

export interface AdminSearchMeta {
  query: string;
  types: AdminSearchType[];
  counts: Partial<Record<AdminSearchType, number>>;
}

export interface AdminSearchQuery {
  q: string;
  types?: AdminSearchType[];
  /** Max results per type (backend max 10). */
  limit?: number;
}

export interface AdminSearchResponse {
  results: AdminSearchResult[];
  meta: AdminSearchMeta;
}

export const searchApi = {
  search: async (query: AdminSearchQuery, signal?: AbortSignal): Promise<AdminSearchResponse> => {
    const result = await api.getWithMeta<AdminSearchResult[], AdminSearchMeta>(
      "/admin/search",
      { q: query.q, types: query.types, limit: query.limit },
      { signal },
    );
    return { results: result.data, meta: result.meta };
  },
};
