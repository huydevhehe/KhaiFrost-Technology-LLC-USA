"use client";

import { useCallback, useEffect, useState } from "react";
import { postCategoriesApi, type AdminPostCategory } from "@/lib/api/admin/postCategories";

export interface CategoriesState {
  categories: AdminPostCategory[];
  loading: boolean;
  error: unknown;
  reload: () => void;
}

/** Post categories for the editor selects. */
export function usePostCategories(): CategoriesState {
  const [categories, setCategories] = useState<AdminPostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);
  const [token, setToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await postCategoriesApi.list(controller.signal);
        if (cancelled) return;
        setCategories(list);
        setError(undefined);
      } catch (caught) {
        if (!cancelled) setError(caught);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  const reload = useCallback(() => setToken((value) => value + 1), []);
  return { categories, loading, error, reload };
}
