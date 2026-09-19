// Admin dashboard endpoints (/admin/dashboard). Mirrors
// backend/src/modules/dashboard/dto/*.

import { api } from "../client";
import type { Locale } from "../types";

export interface CountTrend {
  total: number;
  createdLast30Days: number;
  createdPrevious30Days: number;
  /** null when the previous 30 days had no rows at all. */
  changePercent: number | null;
}

export interface PublicationStatusBreakdown {
  draft: number;
  in_review: number;
  published: number;
  archived: number;
}

export interface VisibilityStatusBreakdown {
  published: number;
  hidden: number;
}

export interface ContactStatusBreakdown {
  new: number;
  seen: number;
  replied: number;
  archived: number;
}

export interface PublicationCount extends CountTrend {
  byStatus: PublicationStatusBreakdown;
}

export interface VisibilityCount extends CountTrend {
  byStatus: VisibilityStatusBreakdown;
}

export interface ContactCount extends CountTrend {
  byStatus: ContactStatusBreakdown;
  /** Messages still in the "new" status. */
  unread: number;
}

export interface DashboardSummary {
  locale: Locale;
  generatedAt: string;
  posts: PublicationCount;
  products: PublicationCount;
  projects: PublicationCount;
  services: PublicationCount;
  testimonials: VisibilityCount;
  clientLocations: VisibilityCount;
  customers: CountTrend;
  staffUsers: CountTrend;
  contacts: ContactCount;
  mediaAssets: CountTrend;
}

export interface RecentActivityItem {
  id: string;
  actorName: string | null;
  action: string;
  entityName: string | null;
  entityId: string | null;
  occurredAt: string;
}

export const dashboardApi = {
  summary: (locale?: Locale, signal?: AbortSignal): Promise<DashboardSummary> =>
    api.get<DashboardSummary>("/admin/dashboard/summary", locale ? { locale } : undefined, { signal }),

  recentActivity: (signal?: AbortSignal): Promise<RecentActivityItem[]> =>
    api.get<RecentActivityItem[]>("/admin/dashboard/recent-activity", undefined, { signal }),
};
