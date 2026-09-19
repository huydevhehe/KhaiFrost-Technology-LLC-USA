"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PagerProps {
  page: number;
  totalPages: number;
  /** e.g. "Tổng: 42 bản ghi". */
  totalLabel: string;
  onChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

/** Windowed page numbers (the shared Pagination renders every page, which does not scale). */
function pageWindow(page: number, totalPages: number): number[] {
  const span = 2;
  const start = Math.max(1, Math.min(page - span, totalPages - span * 2));
  const end = Math.min(totalPages, Math.max(page + span, span * 2 + 1));
  const pages: number[] = [];
  for (let current = Math.max(1, start); current <= end; current += 1) pages.push(current);
  return pages;
}

export function Pager({ page, totalPages, totalLabel, onChange, disabled = false, className = "" }: PagerProps) {
  const pages = totalPages > 0 ? pageWindow(page, totalPages) : [];

  return (
    <nav
      aria-label="Phân trang"
      className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 ${className}`}
    >
      <span>{totalLabel}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Trang trước"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft size={16} />
          </button>
          {pages[0] > 1 && <span className="px-1 text-slate-400">…</span>}
          {pages.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              disabled={disabled}
              aria-current={item === page ? "page" : undefined}
              className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                item === page ? "bg-accent text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}
          {pages[pages.length - 1] < totalPages && <span className="px-1 text-slate-400">…</span>}
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Trang sau"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
