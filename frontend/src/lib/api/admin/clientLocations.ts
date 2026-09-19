// Admin client location (world map pins) endpoints — /admin/client-locations.

import { api } from "../client";
import type { Locale, PaginationMeta } from "../types";

export type ClientLocationStatus = "published" | "hidden";

export interface ClientLocationTranslation {
  quote: string;
  role: string;
  country: string;
}

export interface AdminClientLocation {
  id: string;
  name: string;
  /** Percentage (0–100) of the world map image. */
  x: number;
  y: number;
  latitude: number | null;
  longitude: number | null;
  status: ClientLocationStatus;
  sortOrder: number;
  avatarId: string | null;
  avatarUrl: string | null;
  coverImageId: string | null;
  coverImageUrl: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  translations: Partial<Record<Locale, ClientLocationTranslation>>;
}

export interface ClientLocationTranslationInput {
  quote?: string | null;
  role?: string | null;
  country?: string | null;
}

export interface CreateClientLocationInput {
  name: string;
  x: number;
  y: number;
  latitude?: number | null;
  longitude?: number | null;
  status?: ClientLocationStatus;
  avatarId?: string | null;
  coverImageId?: string | null;
  translations?: Partial<Record<Locale, ClientLocationTranslationInput>>;
}

export interface UpdateClientLocationInput
  extends Partial<Omit<CreateClientLocationInput, "translations">> {
  version: number;
  translations?: Partial<Record<Locale, ClientLocationTranslationInput>>;
}

export interface ListClientLocationsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  status?: ClientLocationStatus;
}

export interface ClientLocationsPage {
  items: AdminClientLocation[];
  meta: PaginationMeta;
}

export const CLIENT_LOCATION_LIMITS = {
  name: 120,
  quote: 1000,
  role: 200,
  country: 120,
} as const;

const BASE = "/admin/client-locations";

export const clientLocationsApi = {
  list: async (query: ListClientLocationsQuery = {}): Promise<ClientLocationsPage> => {
    const result = await api.getWithMeta<AdminClientLocation[], PaginationMeta>(BASE, { ...query });
    return { items: result.data, meta: result.meta };
  },
  get: (id: string): Promise<AdminClientLocation> =>
    api.get<AdminClientLocation>(`${BASE}/${encodeURIComponent(id)}`),
  create: (input: CreateClientLocationInput): Promise<AdminClientLocation> =>
    api.post<AdminClientLocation>(BASE, input),
  update: (id: string, input: UpdateClientLocationInput): Promise<AdminClientLocation> =>
    api.patch<AdminClientLocation>(`${BASE}/${encodeURIComponent(id)}`, input),
  /** Returns the full resulting order. */
  reorder: (ids: string[]): Promise<string[]> => api.put<string[]>(`${BASE}/reorder`, { ids }),
  remove: (id: string): Promise<void> => api.delete<void>(`${BASE}/${encodeURIComponent(id)}`),
};
