"use client";

import { useCallback, useEffect, useState } from "react";
import { projectCategoriesApi, type ProjectCategory } from "@/lib/api/admin/projectCategories";

export interface ProjectCategoriesState {
  categories: ProjectCategory[];
  loading: boolean;
  error: unknown;
  reload: () => void;
}

/** Display name of a category, preferring Vietnamese. */
export function projectCategoryName(category: ProjectCategory): string {
  return category.translations.vi?.name ?? category.translations.en?.name ?? category.slug;
}

/** Project categories for the list filter and the editor select. */
export function useProjectCategories(): ProjectCategoriesState {
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);
  const [token, setToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await projectCategoriesApi.list(controller.signal);
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
