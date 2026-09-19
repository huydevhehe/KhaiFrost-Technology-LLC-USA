"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/lib/api/types";

export interface PagerProps {
  meta: PaginationMeta;
  onChange: (page: number) => void;
  /** e.g. "bài viết". */
  noun?: string;
  disabled?: boolean;
  className?: string;
}

/** Prev/next pager that works with any number of pages. */
export function Pager({
  meta,
  onChange,
  noun = "mục",
  disabled = false,
  className = "",
}: PagerProps) {
  const totalPages = Math.max(1, meta.totalPages);
  const page = Math.min(Math.max(1, meta.page), totalPages);
  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 ${className}`}
    >
      <span>
        Tổng: {meta.total} {noun}
        {totalPages > 1 ? ` · Trang ${page}/${totalPages}` : ""}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Trang trước"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-sm font-medium text-slate-700">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Trang sau"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
