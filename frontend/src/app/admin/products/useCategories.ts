"use client";

import { useCallback, useEffect, useState } from "react";
import {
  productCategoriesApi,
  type AdminProductCategory,
} from "@/lib/api/admin/productCategories";

export interface ProductCategoriesState {
  categories: AdminProductCategory[];
  loading: boolean;
  error: unknown;
  reload: () => void;
}

/** Product categories for the editor selects and the filter bar. */
export function useProductCategories(): ProductCategoriesState {
  const [categories, setCategories] = useState<AdminProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);
  const [token, setToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await productCategoriesApi.list(controller.signal);
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

/** Display name of a product category in the admin UI. */
export function productCategoryName(category: AdminProductCategory): string {
  return category.translations.vi?.name ?? category.translations.en?.name ?? category.slug;
}
