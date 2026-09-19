// Admin media library endpoints (/admin/media).
// Upload needs multipart/form-data, which the JSON client cannot send, so it is
// posted with a small dedicated fetch that mirrors the client's error envelope.

import { API_BASE_URL, ApiError, api, refreshSession } from "../client";
import type { Locale, PaginationMeta } from "../types";

export type MediaKind = "image" | "pdf";
export type MediaSort = "newest" | "oldest" | "name" | "size";

export interface MediaAsset {
  id: string;
  name: string;
  originalName: string;
  displayName: string | null;
  kind: MediaKind;
  mimeType: string;
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  folder: string | null;
  uploadedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUsage {
  entityName: string;
  entityId?: string;
  field: string;
}

export interface MediaLocalizedText {
  vi: string | null;
  en: string | null;
}

export interface MediaVariant {
  url: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  mimeType: string;
}

export interface MediaAssetDetail extends MediaAsset {
  version: number;
  checksumSha256: string;
  variants: Record<string, MediaVariant>;
  altText: MediaLocalizedText;
  caption: MediaLocalizedText;
  usages: MediaUsage[];
}

export interface MediaListQuery {
  search?: string;
  folder?: string;
  type?: MediaKind;
  sort?: MediaSort;
  page?: number;
  pageSize?: number;
}

export interface MediaPage {
  items: MediaAsset[];
  meta: PaginationMeta;
}

export type MediaUploadStatus = "created" | "duplicate" | "rejected";

export interface MediaUploadResult {
  originalName: string;
  status: MediaUploadStatus;
  asset?: MediaAsset;
  error?: { code: string; message: string };
}

export interface MediaUploadResponse {
  results: MediaUploadResult[];
  created: number;
  duplicates: number;
  rejected: number;
}

export interface MediaTranslationInput {
  altText?: string | null;
  caption?: string | null;
}

export interface UpdateMediaInput {
  version?: number;
  displayName?: string | null;
  folder?: string | null;
  translations?: Partial<Record<Locale, MediaTranslationInput>>;
}

/** Max files accepted by one POST /admin/media call. */
export const MEDIA_MAX_FILES_PER_UPLOAD = 20;

export const MEDIA_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

export const MEDIA_PDF_MIME_TYPES = ["application/pdf"] as const;

const MEDIA_ERROR_MESSAGES: Record<string, string> = {
  MEDIA_UNSUPPORTED_TYPE: "Định dạng không được hỗ trợ (chỉ nhận JPEG, PNG, WebP, AVIF, GIF hoặc PDF).",
  MEDIA_EMPTY_FILE: "Tệp rỗng nên không thể tải lên.",
  MEDIA_INVALID_IMAGE: "Tệp ảnh bị lỗi hoặc không đọc được.",
  MEDIA_TOO_LARGE: "Tệp vượt quá dung lượng cho phép.",
  MEDIA_NO_FILES: "Chưa chọn tệp nào để tải lên.",
  MEDIA_TOO_MANY_FILES: `Mỗi lần chỉ tải lên tối đa ${MEDIA_MAX_FILES_PER_UPLOAD} tệp.`,
  MEDIA_PROCESSING_FAILED: "Không xử lý được tệp. Vui lòng thử lại.",
  MEDIA_IN_USE: "Tệp đang được sử dụng trong nội dung khác nên không thể xoá.",
};

/** Vietnamese explanation for a media error code, falling back to the server message. */
export function describeMediaError(code: string | undefined, fallback?: string): string {
  if (code && MEDIA_ERROR_MESSAGES[code]) return MEDIA_ERROR_MESSAGES[code];
  return fallback ?? "Không tải lên được tệp này.";
}

/** Accepted `accept` attribute value for a file input. */
export function mediaAcceptAttribute(kind: MediaKind | "any"): string {
  if (kind === "image") return MEDIA_IMAGE_MIME_TYPES.join(",");
  if (kind === "pdf") return MEDIA_PDF_MIME_TYPES.join(",");
  return [...MEDIA_IMAGE_MIME_TYPES, ...MEDIA_PDF_MIME_TYPES].join(",");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function postMultipart<T>(path: string, form: FormData, signal?: AbortSignal): Promise<T> {
  const send = async (): Promise<Response> => {
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        body: form,
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
      });
    } catch (cause) {
      if (signal?.aborted) {
        throw new ApiError({ code: "ABORTED", message: "Request was cancelled", status: 0 });
      }
      throw new ApiError({
        code: "NETWORK_ERROR",
        message: cause instanceof Error ? cause.message : "Network error",
        status: 0,
      });
    }
  };

  const read = async (response: Response): Promise<{ ok: boolean; status: number; payload: unknown }> => {
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
    return { ok: response.ok, status: response.status, payload };
  };

  let result = await read(await send());
  if (!result.ok && result.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) result = await read(await send());
  }

  if (!result.ok) {
    if (isRecord(result.payload) && isRecord(result.payload.error)) {
      const body = result.payload.error;
      throw new ApiError({
        code: typeof body.code === "string" ? body.code : "UNKNOWN_ERROR",
        message: typeof body.message === "string" ? body.message : "Request failed",
        status: result.status,
        details: body.details,
      });
    }
    throw new ApiError({
      code: "UNKNOWN_ERROR",
      message: `Request failed with status ${result.status}`,
      status: result.status,
    });
  }

  if (isRecord(result.payload) && "data" in result.payload) return result.payload.data as T;
  return result.payload as T;
}

export const mediaApi = {
  list: async (query: MediaListQuery = {}, signal?: AbortSignal): Promise<MediaPage> => {
    const result = await api.getWithMeta<MediaAsset[], PaginationMeta>(
      "/admin/media",
      { ...query },
      { signal },
    );
    return { items: result.data, meta: result.meta };
  },

  get: (id: string, signal?: AbortSignal): Promise<MediaAssetDetail> =>
    api.get<MediaAssetDetail>(`/admin/media/${encodeURIComponent(id)}`, undefined, { signal }),

  /** Uploads up to 20 files in one multipart request; every file gets its own result. */
  upload: (files: File[], options: { folder?: string; signal?: AbortSignal } = {}) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    if (options.folder) form.append("folder", options.folder);
    return postMultipart<MediaUploadResponse>("/admin/media", form, options.signal);
  },

  update: (id: string, input: UpdateMediaInput): Promise<MediaAssetDetail> =>
    api.patch<MediaAssetDetail>(`/admin/media/${encodeURIComponent(id)}`, input),

  /** Rejected with 409 MEDIA_IN_USE while content still references the asset. */
  remove: (id: string): Promise<void> => api.delete<void>(`/admin/media/${encodeURIComponent(id)}`),
};
