// Admin testimonial endpoints — /admin/testimonials.

import { api } from "../client";
import type { Locale, PaginationMeta } from "../types";

export type TestimonialStatus = "published" | "hidden";

export interface TestimonialTranslation {
  quote: string;
  authorRole: string | null;
}

export interface AdminTestimonial {
  id: string;
  authorName: string;
  company: string | null;
  location: string | null;
  rating: number;
  status: TestimonialStatus;
  sortOrder: number;
  avatarId: string | null;
  avatarUrl: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  translations: Partial<Record<Locale, TestimonialTranslation>>;
}

export interface TestimonialTranslationInput {
  quote?: string | null;
  authorRole?: string | null;
}

export interface CreateTestimonialInput {
  authorName: string;
  company?: string | null;
  location?: string | null;
  rating?: number;
  /** Staff may only create hidden ones. */
  status?: TestimonialStatus;
  avatarId?: string | null;
  translations?: Partial<Record<Locale, TestimonialTranslationInput>>;
}

export interface UpdateTestimonialInput extends Omit<CreateTestimonialInput, "authorName"> {
  version: number;
  authorName?: string;
}

export interface ListTestimonialsQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  status?: TestimonialStatus;
}

export interface TestimonialsPage {
  items: AdminTestimonial[];
  meta: PaginationMeta;
}

export const TESTIMONIAL_LIMITS = {
  authorName: 120,
  company: 150,
  location: 150,
  quote: 1000,
  authorRole: 200,
} as const;

const BASE = "/admin/testimonials";

export const testimonialsApi = {
  list: async (query: ListTestimonialsQuery = {}): Promise<TestimonialsPage> => {
    const result = await api.getWithMeta<AdminTestimonial[], PaginationMeta>(BASE, { ...query });
    return { items: result.data, meta: result.meta };
  },
  get: (id: string): Promise<AdminTestimonial> =>
    api.get<AdminTestimonial>(`${BASE}/${encodeURIComponent(id)}`),
  create: (input: CreateTestimonialInput): Promise<AdminTestimonial> =>
    api.post<AdminTestimonial>(BASE, input),
  update: (id: string, input: UpdateTestimonialInput): Promise<AdminTestimonial> =>
    api.patch<AdminTestimonial>(`${BASE}/${encodeURIComponent(id)}`, input),
  /** Returns the full resulting order. */
  reorder: (ids: string[]): Promise<string[]> => api.put<string[]>(`${BASE}/reorder`, { ids }),
  remove: (id: string): Promise<void> => api.delete<void>(`${BASE}/${encodeURIComponent(id)}`),
};
