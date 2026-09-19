// Publishing checklist (/admin/content-health).
// Mirrors backend/src/modules/content-health/dto/content-health-response.dto.ts.

import { api } from "../client";

export type IssueSeverity = "info" | "warning" | "critical";

export interface ContentHealthIssue {
  /** e.g. "posts.published_missing_translation". */
  code: string;
  severity: IssueSeverity;
  /** Entity class name, e.g. "Post". */
  entity: string;
  count: number;
  /** Up to 5 ids of affected rows. */
  sampleIds: string[];
}

export interface PublishedCounts {
  posts: number;
  products: number;
  projects: number;
  services: number;
  testimonials: number;
}

export interface ContentHealthReport {
  hasPublishedPosts: boolean;
  hasPublishedProducts: boolean;
  hasPublishedProjects: boolean;
  hasPublishedServices: boolean;
  hasPublishedTestimonials: boolean;
  counts: PublishedCounts;
  issues: ContentHealthIssue[];
  generatedAt: string;
}

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: "Nghiêm trọng",
  warning: "Cảnh báo",
  info: "Gợi ý",
};

export const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const ENTITY_LABELS: Record<string, string> = {
  Post: "Bài viết",
  Product: "Sản phẩm",
  Project: "Dự án",
  ServiceCategory: "Dịch vụ",
  Page: "Trang",
  Contact: "Liên hệ",
  MediaAsset: "Tệp media",
  NavigationMenu: "Menu điều hướng",
  SiteSetting: "Cài đặt",
  Testimonial: "Đánh giá",
};

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

/** Admin route the issue can be fixed on. */
const ENTITY_ROUTES: Record<string, string> = {
  Post: "/admin/blog",
  Product: "/admin/products",
  Project: "/admin/projects",
  ServiceCategory: "/admin/services",
  Page: "/admin/pages",
  Contact: "/admin/contacts",
  MediaAsset: "/admin/media",
  NavigationMenu: "/admin/navigation",
  SiteSetting: "/admin/settings",
  Testimonial: "/admin/testimonials",
};

export function issueRoute(issue: ContentHealthIssue): string | null {
  return ENTITY_ROUTES[issue.entity] ?? null;
}

const SUFFIX_LABELS: Record<string, string> = {
  published_missing_translation: "Đã xuất bản nhưng thiếu bản dịch bắt buộc",
  stale_drafts: "Bản nháp không được cập nhật hơn 14 ngày",
  review_waiting: "Chờ duyệt hơn 3 ngày",
  published_without_cover: "Đã xuất bản nhưng chưa có ảnh đại diện",
  published_without_price: "Đã xuất bản nhưng chưa có giá",
  no_visible_section: "Trang không có khối nội dung nào được hiển thị",
  not_published: "Trang chưa được xuất bản",
  new_overdue: "Liên hệ mới chưa xử lý quá 48 giờ",
  missing_alt_text: "Ảnh chưa có văn bản thay thế (alt)",
  header_missing: "Chưa có menu header",
  footer_missing: "Chưa có menu footer",
  company_missing: "Chưa lưu nhóm cài đặt Công ty",
};

/** Vietnamese description of an issue code, falling back to the raw code. */
export function issueLabel(code: string): string {
  const suffix = code.includes(".") ? code.slice(code.indexOf(".") + 1) : code;
  return SUFFIX_LABELS[suffix] ?? code;
}

export interface ReadinessCheck {
  key: string;
  label: string;
  done: boolean;
  count: number;
  href: string;
}

/** The "sẵn sàng xuất bản" checklist derived from the report. */
export function readinessChecks(report: ContentHealthReport): ReadinessCheck[] {
  return [
    {
      key: "posts",
      label: "Có bài viết đã xuất bản",
      done: report.hasPublishedPosts,
      count: report.counts.posts,
      href: "/admin/blog",
    },
    {
      key: "products",
      label: "Có sản phẩm đã xuất bản",
      done: report.hasPublishedProducts,
      count: report.counts.products,
      href: "/admin/products",
    },
    {
      key: "projects",
      label: "Có dự án đã xuất bản",
      done: report.hasPublishedProjects,
      count: report.counts.projects,
      href: "/admin/projects",
    },
    {
      key: "services",
      label: "Có dịch vụ đã xuất bản",
      done: report.hasPublishedServices,
      count: report.counts.services,
      href: "/admin/services",
    },
    {
      key: "testimonials",
      label: "Có đánh giá đã xuất bản",
      done: report.hasPublishedTestimonials,
      count: report.counts.testimonials,
      href: "/admin/testimonials",
    },
  ];
}

export const contentHealthApi = {
  get: (signal?: AbortSignal): Promise<ContentHealthReport> =>
    api.get<ContentHealthReport>("/admin/content-health", undefined, { signal }),
};
