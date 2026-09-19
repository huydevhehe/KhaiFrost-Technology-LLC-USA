// Admin navigation menus (/admin/navigation).
// Mirrors backend/src/modules/navigation. A PUT replaces the whole tree atomically.

import { api } from "../client";
import type { Locale } from "../types";

export type NavigationLinkType = "page" | "external" | "path" | "none";

export const NAVIGATION_LINK_TYPES: readonly NavigationLinkType[] = [
  "page",
  "path",
  "external",
  "none",
] as const;

export const NAVIGATION_LINK_TYPE_LABELS: Record<NavigationLinkType, string> = {
  page: "Trang trong hệ thống",
  path: "Đường dẫn nội bộ",
  external: "Liên kết ngoài",
  none: "Không liên kết (tiêu đề nhóm)",
};

export const MAX_NAVIGATION_DEPTH = 3;
export const MAX_NAVIGATION_ITEMS = 100;
export const NAVIGATION_LABEL_MAX_LENGTH = 120;
export const NAVIGATION_URL_MAX_LENGTH = 500;

/** Menus seeded by the backend. */
export const NAVIGATION_MENUS = [
  { key: "header", label: "Menu đầu trang" },
  { key: "footer", label: "Menu chân trang" },
] as const;

export interface NavigationItem {
  id: string;
  linkType: NavigationLinkType;
  pageId: string | null;
  pagePath: string | null;
  url: string | null;
  openInNewTab: boolean;
  isVisible: boolean;
  translations: Partial<Record<Locale, { label: string }>>;
  children: NavigationItem[];
}

export interface NavigationMenu {
  key: string;
  /** 0 when the menu was never saved. */
  version: number;
  items: NavigationItem[];
}

export interface NavigationItemInput {
  /** Existing item id, kept so labels and children stay stable across saves. */
  id?: string;
  linkType: NavigationLinkType;
  pageId?: string | null;
  url?: string | null;
  openInNewTab?: boolean;
  isVisible?: boolean;
  translations: Record<Locale, { label: string }>;
  children?: NavigationItemInput[];
}

export interface ReplaceNavigationInput {
  version: number;
  items: NavigationItemInput[];
}

const BASE = "/admin/navigation";

export const navigationApi = {
  listMenus: (signal?: AbortSignal): Promise<{ key: string; version: number }[]> =>
    api.get<{ key: string; version: number }[]>(BASE, undefined, { signal }),

  get: (menuKey: string, signal?: AbortSignal): Promise<NavigationMenu> =>
    api.get<NavigationMenu>(`${BASE}/${encodeURIComponent(menuKey)}`, undefined, { signal }),

  /** Replaces the whole tree; rejects with VERSION_CONFLICT when someone else saved first. */
  replace: (menuKey: string, input: ReplaceNavigationInput): Promise<NavigationMenu> =>
    api.put<NavigationMenu>(`${BASE}/${encodeURIComponent(menuKey)}`, input),
};

/** Mirrors the backend link rules; returns a Vietnamese message or null. */
export function describeNavigationLinkProblem(item: {
  linkType: NavigationLinkType;
  pageId?: string | null;
  url?: string | null;
}): string | null {
  if (item.linkType === "page") {
    return item.pageId ? null : "Hãy chọn trang cho mục này.";
  }
  if (item.linkType === "external") {
    const value = (item.url ?? "").trim();
    if (!value) return "Nhập liên kết http hoặc https.";
    try {
      const parsed = new URL(value);
      if ((parsed.protocol === "http:" || parsed.protocol === "https:") && !/\s/.test(value)) return null;
    } catch {
      /* falls through */
    }
    return "Liên kết ngoài phải bắt đầu bằng http:// hoặc https://.";
  }
  if (item.linkType === "path") {
    const value = (item.url ?? "").trim();
    if (!value) return "Nhập đường dẫn nội bộ, ví dụ /lien-he.";
    if (/^\/(?!\/)[^\s\\]*$/.test(value) || /^#[^\s]*$/.test(value)) return null;
    return "Đường dẫn nội bộ phải bắt đầu bằng dấu / (vd /lien-he).";
  }
  return null;
}
