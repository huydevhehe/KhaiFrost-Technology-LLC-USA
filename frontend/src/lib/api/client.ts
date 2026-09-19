import type { ApiErrorBody, FieldErrorDetail, Paginated, PaginationMeta } from "./types";

/** Base URL of the REST API. Override with NEXT_PUBLIC_API_BASE_URL. */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/+$/, "");

export const DEFAULT_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(init: { code: string; message: string; status: number; details?: unknown; requestId?: string }) {
    super(init.message);
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status;
    this.details = init.details;
    this.requestId = init.requestId;
  }

  /** Per-field validation messages when code is VALIDATION_FAILED. */
  get fieldErrors(): FieldErrorDetail[] {
    return extractFieldErrors(this.details);
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

function extractFieldErrors(details: unknown): FieldErrorDetail[] {
  if (!Array.isArray(details)) return [];
  const result: FieldErrorDetail[] = [];
  for (const item of details) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.field !== "string") continue;
    const messages = Array.isArray(record.messages)
      ? record.messages.filter((m): m is string => typeof m === "string")
      : [];
    result.push({ field: record.field, messages });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Events (auth lost / admin session required)
// ---------------------------------------------------------------------------

type Listener = () => void;

const adminSessionListeners = new Set<Listener>();
const authLostListeners = new Set<Listener>();

/** Called when any request fails with ADMIN_SESSION_REQUIRED (elevated session expired). Returns unsubscribe. */
export function onAdminSessionRequired(listener: Listener): () => void {
  adminSessionListeners.add(listener);
  return () => {
    adminSessionListeners.delete(listener);
  };
}

/** Called when a request got 401 and the silent refresh failed too (user is signed out). Returns unsubscribe. */
export function onAuthLost(listener: Listener): () => void {
  authLostListeners.add(listener);
  return () => {
    authLostListeners.delete(listener);
  };
}

function emit(listeners: Set<Listener>): void {
  for (const listener of Array.from(listeners)) listener();
}

// ---------------------------------------------------------------------------
// Query strings
// ---------------------------------------------------------------------------

export type QueryPrimitive = string | number | boolean;
export type QueryValue = QueryPrimitive | null | undefined | readonly QueryPrimitive[];
export type QueryParams = Record<string, QueryValue>;

/** Builds a URL-encoded query string ("?a=1&b=2" or ""). Skips null/undefined/empty strings; arrays repeat the key. */
export function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value as readonly QueryPrimitive[]) search.append(key, String(item));
    } else if (typeof value === "string") {
      if (value.trim() !== "") search.append(key, value);
    } else {
      search.append(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  query?: QueryParams;
  /** JSON body (objects are serialised, undefined sends nothing). */
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Disable the silent refresh + retry on 401. */
  skipRefresh?: boolean;
}

export interface ApiResponse<T, M = undefined> {
  data: T;
  meta: M;
}

const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
];

function shouldTryRefresh(path: string, options: RequestOptions, error: ApiError): boolean {
  if (options.skipRefresh) return false;
  if (error.status !== 401) return false;
  if (error.code === "INVALID_CREDENTIALS") return false;
  return !NO_REFRESH_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}?`));
}

let refreshInFlight: Promise<boolean> | null = null;

/** Rotates the refresh token once even when many requests fail at the same time. */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        await execute("/auth/refresh", { method: "POST", skipRefresh: true });
        return true;
      } catch {
        return false;
      } finally {
        // Keep the resolved promise for a tick so callers arriving right after also share it.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toApiError(status: number, payload: unknown): ApiError {
  if (isRecord(payload) && isRecord(payload.error)) {
    const body = payload.error as Partial<ApiErrorBody>;
    return new ApiError({
      code: typeof body.code === "string" ? body.code : "UNKNOWN_ERROR",
      message: typeof body.message === "string" ? body.message : "Request failed",
      status,
      details: body.details,
      requestId: typeof body.requestId === "string" ? body.requestId : undefined,
    });
  }
  return new ApiError({ code: "UNKNOWN_ERROR", message: `Request failed with status ${status}`, status });
}

async function execute(path: string, options: RequestOptions): Promise<ApiResponse<unknown, unknown>> {
  const method = options.method ?? "GET";
  const url = `${API_BASE_URL}${path}${buildQuery(options.query)}`;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
        credentials: "include",
        signal: controller.signal,
      });
    } catch (cause) {
      if (timedOut) {
        throw new ApiError({ code: "TIMEOUT", message: "Request timed out", status: 0 });
      }
      if (options.signal?.aborted) {
        throw new ApiError({ code: "ABORTED", message: "Request was cancelled", status: 0 });
      }
      throw new ApiError({
        code: "NETWORK_ERROR",
        message: cause instanceof Error ? cause.message : "Network error",
        status: 0,
      });
    }

    if (response.status === 204) return { data: undefined, meta: undefined };

    let payload: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) throw toApiError(response.status, payload);

    if (isRecord(payload) && "data" in payload) {
      return { data: payload.data, meta: payload.meta };
    }
    return { data: payload, meta: undefined };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}

/** Low level request: returns `{ data, meta }` from the response envelope. */
export async function apiFetch<T, M = undefined>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T, M>> {
  try {
    return (await execute(path, options)) as ApiResponse<T, M>;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;

    if (shouldTryRefresh(path, options, error)) {
      const refreshed = await refreshSession();
      if (refreshed) {
        try {
          return (await execute(path, options)) as ApiResponse<T, M>;
        } catch (retryError) {
          if (retryError instanceof ApiError) notifyForError(retryError);
          throw retryError;
        }
      }
      emit(authLostListeners);
      throw error;
    }

    notifyForError(error);
    throw error;
  }
}

function notifyForError(error: ApiError): void {
  if (error.status === 403 && error.code === "ADMIN_SESSION_REQUIRED") emit(adminSessionListeners);
  else if (error.status === 401 && error.code !== "INVALID_CREDENTIALS") emit(authLostListeners);
}

type CallOptions = Omit<RequestOptions, "method" | "body" | "query">;

/** High level helpers: every method resolves with the unwrapped `data`. */
export const api = {
  get<T>(path: string, query?: QueryParams, options?: CallOptions): Promise<T> {
    return apiFetch<T>(path, { ...options, method: "GET", query }).then((r) => r.data);
  },
  /** GET a list endpoint that answers `{ data: items[], meta: pagination }`. */
  getPage<T>(path: string, query?: QueryParams, options?: CallOptions): Promise<Paginated<T>> {
    return apiFetch<T[], PaginationMeta>(path, { ...options, method: "GET", query }).then((r) => ({
      items: r.data,
      meta: r.meta,
    }));
  },
  /** GET when you need both `data` and a custom `meta` shape. */
  getWithMeta<T, M>(path: string, query?: QueryParams, options?: CallOptions): Promise<ApiResponse<T, M>> {
    return apiFetch<T, M>(path, { ...options, method: "GET", query });
  },
  post<T = void>(path: string, body?: unknown, options?: CallOptions & { query?: QueryParams }): Promise<T> {
    return apiFetch<T>(path, { ...options, method: "POST", body }).then((r) => r.data);
  },
  put<T = void>(path: string, body?: unknown, options?: CallOptions & { query?: QueryParams }): Promise<T> {
    return apiFetch<T>(path, { ...options, method: "PUT", body }).then((r) => r.data);
  },
  patch<T = void>(path: string, body?: unknown, options?: CallOptions & { query?: QueryParams }): Promise<T> {
    return apiFetch<T>(path, { ...options, method: "PATCH", body }).then((r) => r.data);
  },
  delete<T = void>(path: string, options?: CallOptions & { query?: QueryParams; body?: unknown }): Promise<T> {
    return apiFetch<T>(path, { ...options, method: "DELETE" }).then((r) => r.data);
  },
};

// Stable standalone aliases so feature modules can import a single helper.
export const apiGet = api.get;
export const apiGetPage = api.getPage;
export const apiGetWithMeta = api.getWithMeta;
export const apiPost = api.post;
export const apiPut = api.put;
export const apiPatch = api.patch;
export const apiDelete = api.delete;
