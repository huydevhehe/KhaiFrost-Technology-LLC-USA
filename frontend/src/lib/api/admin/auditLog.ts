// Audit trail (/admin/audit-logs). Read only.
// Mirrors backend/src/modules/audit-log/dto/*.

import { API_BASE_URL, ApiError, api, buildQuery } from "../client";
import type { PaginationMeta } from "../types";

export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entityName: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  statusCode: number | null;
  metadata: Record<string, unknown>;
}

export interface AuditLogFilters {
  /** ISO date-time, inclusive. */
  from?: string;
  to?: string;
  actorId?: string;
  action?: string;
  entityName?: string;
  search?: string;
}

export interface ListAuditLogsQuery extends AuditLogFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  meta: PaginationMeta;
}

/** Turns a date input value ("2026-09-19") into an inclusive ISO bound. */
export function toIsoBound(date: string, edge: "start" | "end"): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T${edge === "start" ? "00:00:00" : "23:59:59"}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

// ---- Vietnamese wording for action codes -------------------------------

const AUTH_ACTIONS: Record<string, string> = {
  "auth.login.succeeded": "Đăng nhập thành công",
  "auth.login.failed": "Đăng nhập thất bại",
  "auth.logout": "Đăng xuất",
  "auth.logout-all": "Đăng xuất mọi thiết bị",
  "auth.registered": "Đăng ký tài khoản",
  "auth.refresh.reuse-detected": "Phát hiện token bị dùng lại",
  "auth.admin-session.started": "Mở phiên quản trị",
  "auth.admin-session.ended": "Đóng phiên quản trị",
  "auth.admin-session.failed": "Mở phiên quản trị thất bại",
  "auth.password.changed": "Đổi mật khẩu",
  "auth.password.change-failed": "Đổi mật khẩu thất bại",
  "auth.password-reset.requested": "Yêu cầu đặt lại mật khẩu",
  "auth.password-reset.completed": "Đặt lại mật khẩu",
  "auth.password-reset.failed": "Đặt lại mật khẩu thất bại",
  "auth.account.locked": "Tài khoản bị khoá",
  "auth.account.deleted": "Tài khoản bị xoá",
};

const ACTION_VERBS: Record<string, string> = {
  created: "Tạo",
  updated: "Cập nhật",
  deleted: "Xoá",
  published: "Xuất bản",
  unpublished: "Gỡ xuất bản",
  archived: "Lưu trữ",
  restored: "Khôi phục",
  rejected: "Từ chối",
  reverted: "Hoàn tác",
  locked: "Khoá",
  unlocked: "Mở khoá",
  reordered: "Sắp xếp lại",
  uploaded: "Tải lên",
  exported: "Xuất dữ liệu",
  imported: "Nhập dữ liệu",
  assigned: "Phân công",
  "note-added": "Thêm ghi chú",
  "status-changed": "Đổi trạng thái",
  "password-reset": "Đặt lại mật khẩu",
  "submitted-for-review": "Gửi duyệt",
  "draft-discarded": "Huỷ bản nháp",
  "account-deleted": "Xoá tài khoản",
  "section-added": "Thêm khối nội dung",
  "section-updated": "Sửa khối nội dung",
  "section-deleted": "Xoá khối nội dung",
  "sections-reordered": "Sắp xếp khối nội dung",
};

const ACTION_SUBJECTS: Record<string, string> = {
  post: "bài viết",
  "post-category": "chuyên mục bài viết",
  product: "sản phẩm",
  "product-category": "danh mục sản phẩm",
  project: "dự án",
  "project-category": "danh mục dự án",
  service: "dịch vụ",
  "service-overview": "trang tổng quan dịch vụ",
  page: "trang",
  user: "tài khoản nội bộ",
  customer: "khách hàng",
  contact: "liên hệ",
  media: "tệp media",
  setting: "cài đặt",
  navigation: "menu điều hướng",
  "ui-translation": "chuỗi giao diện",
  testimonial: "đánh giá",
  "client-location": "vị trí khách hàng",
  "audit-log": "nhật ký hoạt động",
  profile: "hồ sơ cá nhân",
};

/** "post.published" -> "Xuất bản bài viết". Unknown codes are returned as is. */
export function describeAuditAction(action: string): string {
  if (AUTH_ACTIONS[action]) return AUTH_ACTIONS[action];
  const separator = action.indexOf(".");
  if (separator === -1) return action;
  const subject = ACTION_SUBJECTS[action.slice(0, separator)];
  const verb = ACTION_VERBS[action.slice(separator + 1)];
  if (!subject || !verb) return action;
  return `${verb} ${subject}`;
}

export const auditLogApi = {
  list: async (query: ListAuditLogsQuery = {}, signal?: AbortSignal): Promise<AuditLogPage> => {
    const result = await api.getWithMeta<AuditLogEntry[], PaginationMeta>(
      "/admin/audit-logs",
      { ...query },
      { signal },
    );
    return { items: result.data, meta: result.meta };
  },

  /**
   * Downloads the filtered trail as CSV. The endpoint streams a file instead of
   * the JSON envelope, so it is fetched directly (cookies included) and handed
   * to the browser as a blob.
   */
  exportCsv: async (filters: AuditLogFilters = {}): Promise<{ blob: Blob; filename: string }> => {
    const url = `${API_BASE_URL}/admin/audit-logs/export${buildQuery({ ...filters })}`;
    let response: Response;
    try {
      response = await fetch(url, { credentials: "include", headers: { Accept: "text/csv" } });
    } catch (cause) {
      throw new ApiError({
        code: "NETWORK_ERROR",
        message: cause instanceof Error ? cause.message : "Network error",
        status: 0,
      });
    }
    if (!response.ok) {
      let code = "UNKNOWN_ERROR";
      let message = `Request failed with status ${response.status}`;
      try {
        const payload = (await response.json()) as { error?: { code?: string; message?: string } };
        if (payload?.error?.code) code = payload.error.code;
        if (payload?.error?.message) message = payload.error.message;
      } catch {
        // Not a JSON error body; keep the defaults.
      }
      throw new ApiError({ code, message, status: response.status });
    }
    const disposition = response.headers.get("content-disposition") ?? "";
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    return { blob: await response.blob(), filename: match?.[1] ?? "audit-log.csv" };
  },
};
