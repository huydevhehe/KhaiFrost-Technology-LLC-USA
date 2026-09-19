import { useCallback, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, type QueryParams } from "@/lib/api/client";

export type ContentLocale = "vi" | "en";

/** Public content is re-fetched in the background once a cached entry is older than this. */
const STALE_AFTER_MS = 60_000;
/** After a failed request the same key is not retried before this delay. */
const RETRY_AFTER_MS = 20_000;
const REQUEST_TIMEOUT_MS = 8_000;
const FETCH_DEFER_MS = 40;

interface Entry {
  value: unknown;
  loadedAt: number;
  failedAt: number;
  inFlight: boolean;
  listeners: Set<() => void>;
}

// Module-level cache: one entry per "path?query" so every component reading the same content shares one request.
const entries = new Map<string, Entry>();

function getEntry(key: string): Entry {
  let entry = entries.get(key);
  if (!entry) {
    entry = { value: undefined, loadedAt: 0, failedAt: 0, inFlight: false, listeners: new Set() };
    entries.set(key, entry);
  }
  return entry;
}

function buildKey(path: string, query: QueryParams): string {
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`);
  return parts.length ? `${path}?${parts.join("&")}` : path;
}

function ensureFresh(key: string, path: string, query: QueryParams): void {
  const entry = getEntry(key);
  if (entry.inFlight) return;
  const now = Date.now();
  if (entry.value !== undefined && now - entry.loadedAt < STALE_AFTER_MS) return;
  if (entry.value === undefined && entry.failedAt && now - entry.failedAt < RETRY_AFTER_MS) return;
  entry.inFlight = true;
  void (async () => {
    try {
      const data = await apiGet<unknown>(path, query, { skipRefresh: true, timeoutMs: REQUEST_TIMEOUT_MS });
      if (data !== undefined && data !== null) {
        const changed = JSON.stringify(data) !== JSON.stringify(entry.value);
        entry.loadedAt = Date.now();
        entry.failedAt = 0;
        if (changed) {
          entry.value = data;
          for (const listener of Array.from(entry.listeners)) listener();
        }
      } else {
        entry.failedAt = Date.now();
      }
    } catch {
      entry.failedAt = Date.now();
    } finally {
      entry.inFlight = false;
    }
  })();
}

/** Current UI language reduced to the two locales the API knows. */
export function useContentLocale(): ContentLocale {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith("vi") ? "vi" : "en";
}

/**
 * Reads a public API resource for the current language. Returns `undefined` until the data has arrived (and
 * when the request failed), so callers render their static fallback in that case. Server render and the
 * first client render always see `undefined`, which keeps hydration identical to the static content.
 */
export function usePublicData<T>(path: string, options?: { localized?: boolean; query?: QueryParams }): T | undefined {
  const locale = useContentLocale();
  const localized = options?.localized ?? true;
  const extra = options?.query;
  const queryKey = extra ? JSON.stringify(extra) : "";
  const key = buildKey(path, { ...extra, locale: localized ? locale : undefined });

  const subscribe = useCallback(
    (onChange: () => void) => {
      const query: QueryParams = { ...(queryKey ? (JSON.parse(queryKey) as QueryParams) : {}) };
      if (localized) query.locale = locale;
      const entry = getEntry(key);
      entry.listeners.add(onChange);
      // Deferred so the initial "en" render (before the saved language is applied) does not fire a request
      // for a locale that is unsubscribed a moment later.
      const timer = setTimeout(() => {
        if (entry.listeners.has(onChange)) ensureFresh(key, path, query);
      }, FETCH_DEFER_MS);
      return () => {
        clearTimeout(timer);
        entry.listeners.delete(onChange);
      };
    },
    [key, path, locale, localized, queryKey],
  );
  const getSnapshot = useCallback(() => getEntry(key).value as T | undefined, [key]);
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

/** One-off cached fetch for non-hook callers (UI translation bootstrap). Resolves null on failure. */
export async function fetchPublicOnce<T>(path: string, query?: QueryParams): Promise<T | null> {
  try {
    return await apiGet<T>(path, query, { skipRefresh: true, timeoutMs: REQUEST_TIMEOUT_MS });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mapper helpers
// ---------------------------------------------------------------------------

export function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

/** Wraps an API string (already in `locale`) as LocalizedText; an empty value falls back to the static text. */
export function localized(
  locale: ContentLocale,
  value: unknown,
  fallback: { en: string; vi: string },
): { en: string; vi: string } {
  const v = text(value, fallback[locale]);
  return { en: v, vi: v };
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
