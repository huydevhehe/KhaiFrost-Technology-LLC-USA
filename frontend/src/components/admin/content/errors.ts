// Vietnamese wording for the content API errors (posts, products, projects,
// testimonials, client locations) and helpers for the 422 TRANSLATION_MISSING details.

import { isApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errorMessages";
import { LOCALE_LABELS, type Locale } from "@/components/admin/shared";

export interface MissingTranslationItem {
  locale: Locale;
  field: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Tiêu đề",
  name: "Tên",
  excerpt: "Mô tả ngắn",
  summary: "Tóm tắt",
  tagline: "Khẩu hiệu",
  contentHtml: "Nội dung",
  descriptionHtml: "Nội dung mô tả",
  heading: "Tiêu đề mục",
  bodyHtml: "Nội dung mục",
  quote: "Trích dẫn",
  role: "Vai trò",
  country: "Quốc gia",
  slug: "Đường dẫn",
  sku: "Mã SKU",
  categoryId: "Danh mục",
  coverImageId: "Ảnh bìa",
  thumbnailId: "Ảnh đại diện",
  demoUrl: "Liên kết demo",
  videoUrl: "Liên kết video",
  videoDuration: "Thời lượng video",
  completedAt: "Ngày hoàn thành",
  authorName: "Tác giả",
  clientName: "Khách hàng",
  technologies: "Công nghệ",
  techStack: "Công nghệ",
  specifications: "Thông số",
  prices: "Bảng giá",
  rating: "Đánh giá",
  x: "Toạ độ X",
  y: "Toạ độ Y",
  latitude: "Vĩ độ",
  longitude: "Kinh độ",
  translations: "Nội dung đa ngôn ngữ",
};

/** "sections[0].heading" → "Tiêu đề mục (mục 1)". */
export function describeField(field: string): string {
  const sectionMatch = /^sections\[(\d+)\]\.(\w+)$/.exec(field);
  if (sectionMatch) {
    const label = FIELD_LABELS[sectionMatch[2]] ?? sectionMatch[2];
    return `${label} (mục ${Number(sectionMatch[1]) + 1})`;
  }
  const last = field.split(".").pop() ?? field;
  return FIELD_LABELS[last] ?? FIELD_LABELS[field] ?? field;
}

/** Per-field Vietnamese messages from a VALIDATION_FAILED response. */
export function contentFieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error) || error.code !== "VALIDATION_FAILED") return {};
  const result: Record<string, string> = {};
  for (const detail of error.fieldErrors) {
    if (detail.field in result) continue;
    result[detail.field] = detail.messages[0] ?? "Giá trị không hợp lệ.";
  }
  return result;
}

/** The `{ locale, field }[]` details of a 422 TRANSLATION_MISSING response. */
export function missingTranslationItems(error: unknown): MissingTranslationItem[] {
  if (!isApiError(error) || error.code !== "TRANSLATION_MISSING") return [];
  if (!Array.isArray(error.details)) return [];
  const items: MissingTranslationItem[] = [];
  for (const entry of error.details) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (record.locale !== "vi" && record.locale !== "en") continue;
    if (typeof record.field !== "string") continue;
    items.push({ locale: record.locale, field: record.field });
  }
  return items;
}

/** "Tiếng Việt: Tiêu đề, Nội dung · English: Mô tả ngắn". */
export function describeMissingTranslations(items: readonly MissingTranslationItem[]): string {
  const byLocale = new Map<Locale, string[]>();
  for (const item of items) {
    const list = byLocale.get(item.locale) ?? [];
    list.push(describeField(item.field));
    byLocale.set(item.locale, list);
  }
  return [...byLocale.entries()]
    .map(([locale, fields]) => `${LOCALE_LABELS[locale]}: ${fields.join(", ")}`)
    .join(" · ");
}

export function isVersionConflict(error: unknown): boolean {
  return isApiError(error) && error.code === "VERSION_CONFLICT";
}

const CODE_MESSAGES: Record<string, string> = {
  VERSION_CONFLICT:
    "Nội dung đã được người khác chỉnh sửa. Hãy tải lại bản mới nhất rồi lưu lại thay đổi của bạn.",
  SLUG_TAKEN: "Đường dẫn này đã được dùng. Vui lòng chọn đường dẫn khác.",
  SKU_TAKEN: "Mã SKU này đã được dùng cho sản phẩm khác.",
  CATEGORY_IN_USE:
    "Danh mục vẫn còn nội dung bên trong. Hãy chuyển hoặc xoá các mục đó trước khi xoá danh mục.",
  INVALID_STATUS_TRANSITION:
    "Không thể chuyển trạng thái này. Hãy tải lại để xem trạng thái hiện tại.",
  PRODUCT_PRICE_REQUIRED:
    "Cần ít nhất một mức giá, hoặc bật “Giá theo yêu cầu” trước khi xuất bản.",
  HOSTING_BILLING_PERIOD_REQUIRED:
    "Gói hosting chỉ nhận mức giá theo tháng hoặc theo năm.",
  DEMO_URL_REQUIRED: "Sản phẩm dạng demo trực tiếp cần có liên kết demo trước khi xuất bản.",
  PRICE_ON_REQUEST_WITH_PRICES:
    "Khi bật “Giá theo yêu cầu” thì không được giữ bảng giá. Hãy xoá các mức giá trước.",
};

/** Vietnamese message for any content error, including the missing-translation list. */
export function describeContentError(error: unknown): string {
  if (!isApiError(error)) return describeApiError(error);
  if (error.code === "TRANSLATION_MISSING") {
    const items = missingTranslationItems(error);
    const detail = describeMissingTranslations(items);
    return detail
      ? `Chưa đủ nội dung để xuất bản — ${detail}.`
      : "Chưa đủ nội dung bắt buộc ở cả hai ngôn ngữ.";
  }
  const mapped = CODE_MESSAGES[error.code];
  if (mapped) return mapped;
  if (error.code === "CONFLICT" && /slug/i.test(error.message)) return CODE_MESSAGES.SLUG_TAKEN;
  if (error.code === "CONFLICT" && /categor/i.test(error.message)) {
    return CODE_MESSAGES.CATEGORY_IN_USE;
  }
  if (error.code === "FORBIDDEN") {
    return "Bạn không có quyền thực hiện thao tác này với nội dung đang chọn.";
  }
  return describeApiError(error);
}
