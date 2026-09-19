"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, buildQuery, isApiError, type QueryParams, type QueryValue } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/types";

const EMPTY_META: PaginationMeta = { page: 1, pageSize: 20, total: 0, totalPages: 0 };

function isAborted(error: unknown): boolean {
  return isApiError(error) && error.code === "ABORTED";
}

export interface UseApiListOptions {
  pageSize?: number;
  /** Initial search text. */
  initialSearch?: string;
  /** Extra query params (status, category, locale…). Changing them resets to page 1. */
  filters?: QueryParams;
  /** Debounce applied to the search box (default 300ms). */
  debounceMs?: number;
  /** Skip fetching entirely (e.g. while a dialog is closed). */
  enabled?: boolean;
  /** Keep showing the previous page while the next one loads. */
  keepPreviousData?: boolean;
}

export interface UseApiListResult<T> {
  items: T[];
  meta: PaginationMeta;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  search: string;
  /** Updates the input immediately; the request is debounced. */
  setSearch: (value: string) => void;
  loading: boolean;
  /** The thrown value (ApiError for API failures); aborted requests are ignored. */
  error: unknown;
  refetch: () => void;
  /** Local list edit after a delete/update, without a round trip. */
  setItems: (updater: (items: T[]) => T[]) => void;
}

/**
 * Paginated admin list: page/pageSize/search state, debounced search, aborts the
 * previous request on every change. ApiError is surfaced, never swallowed, so the
 * client's ADMIN_SESSION_REQUIRED / 401 events still fire.
 */
export function useApiList<T>(path: string, options: UseApiListOptions = {}): UseApiListResult<T> {
  const {
    pageSize: initialPageSize = 20,
    initialSearch = "",
    filters,
    debounceMs = 300,
    enabled = true,
    keepPreviousData = false,
  } = options;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [items, setItemsState] = useState<T[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ ...EMPTY_META, pageSize: initialPageSize });
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(undefined);
  const [reloadToken, setReloadToken] = useState(0);

  const filtersKey = buildQuery(filters);
  const filtersRef = useRef<QueryParams | undefined>(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Debounce the search box.
  useEffect(() => {
    if (search === debouncedSearch) return;
    const timer = window.setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => window.clearTimeout(timer);
  }, [search, debouncedSearch, debounceMs]);

  // A new search or filter always restarts at page 1.
  const resetKey = `${debouncedSearch}|${filtersKey}|${pageSize}`;
  const previousResetKey = useRef(resetKey);
  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      if (!keepPreviousData) setError(undefined);
      try {
        const result = await api.getWithMeta<T[], PaginationMeta>(
          path,
          { page, pageSize, search: debouncedSearch, ...(filtersRef.current ?? {}) },
          { signal: controller.signal },
        );
        if (cancelled) return;
        setItemsState(Array.isArray(result.data) ? result.data : []);
        setMeta(result.meta ?? { ...EMPTY_META, page, pageSize });
        setError(undefined);
      } catch (caught) {
        if (cancelled || isAborted(caught)) return;
        setError(caught);
        if (!keepPreviousData) {
          setItemsState([]);
          setMeta({ ...EMPTY_META, page, pageSize });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [path, page, pageSize, debouncedSearch, filtersKey, enabled, keepPreviousData, reloadToken]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);
  const setItems = useCallback(
    (updater: (current: T[]) => T[]) => setItemsState((current) => updater(current)),
    [],
  );

  return {
    items,
    meta,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    loading,
    error,
    refetch,
    setItems,
  };
}

export interface UseApiResourceOptions {
  /** Extra query params such as `{ locale: "vi" }`. */
  query?: QueryParams;
  enabled?: boolean;
}

export interface UseApiResourceResult<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  refetch: () => void;
  /** Replaces the cached value after a successful save. */
  setData: (value: T | null) => void;
}

/** Single admin resource. Pass `null` as the path while the id is unknown. */
export function useApiResource<T>(
  path: string | null,
  options: UseApiResourceOptions = {},
): UseApiResourceResult<T> {
  const { query, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path) && enabled);
  const [error, setError] = useState<unknown>(undefined);
  const [reloadToken, setReloadToken] = useState(0);

  const queryKey = buildQuery(query);
  const queryRef = useRef<QueryParams | undefined>(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    if (!path || !enabled) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await api.get<T>(path, queryRef.current, { signal: controller.signal });
        if (cancelled) return;
        setData(result);
      } catch (caught) {
        if (cancelled || isAborted(caught)) return;
        setError(caught);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [path, queryKey, enabled, reloadToken]);

  const refetch = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, loading, error, refetch, setData };
}

/** Helper for building a stable `filters` object without re-running the list on every render. */
export function useFilters(values: Record<string, QueryValue>): QueryParams {
  const key = buildQuery(values);
  return useMemo(() => ({ ...values }), [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
