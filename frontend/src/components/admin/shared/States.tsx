"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCcw } from "lucide-react";
import { describeApiError } from "@/lib/api/errorMessages";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** Usually a PrimaryButton ("Thêm mới"). */
  action?: ReactNode;
  className?: string;
}

/** Friendly placeholder for an empty list or grid. */
export function EmptyState({ title, description, icon, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center ${className}`}
    >
      <span className="text-slate-300">{icon ?? <Inbox size={28} />}</span>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && <p className="max-w-md text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  /** Any thrown value; ApiError is mapped to a Vietnamese message. */
  error?: unknown;
  title?: string;
  /** Overrides the message derived from `error`. */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Error placeholder with an optional retry button. */
export function ErrorState({
  error,
  title = "Không tải được dữ liệu",
  message,
  onRetry,
  retryLabel = "Thử lại",
  className = "",
}: ErrorStateProps) {
  const text = message ?? (error === undefined ? undefined : describeApiError(error));
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50/60 px-6 py-10 text-center ${className}`}
    >
      <AlertTriangle size={26} className="text-red-500" />
      <p className="text-sm font-medium text-red-700">{title}</p>
      {text && <p className="max-w-md text-xs text-red-600">{text}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none"
        >
          <RotateCcw size={15} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  /** Renders a header row of shimmering cells. */
  withHeader?: boolean;
  className?: string;
}

/** Placeholder rows shown while a list is loading. */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  withHeader = true,
  className = "",
}: TableSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-busy="true">
      <span className="sr-only">Đang tải dữ liệu…</span>
      {withHeader && (
        <div className="flex gap-3 border-b border-slate-100 px-1 py-3">
          {Array.from({ length: columns }, (_, c) => (
            <div key={c} className="h-3 flex-1 rounded bg-slate-200" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-3 border-b border-slate-50 px-1 py-4">
          {Array.from({ length: columns }, (_, c) => (
            <div
              key={c}
              className="h-3 flex-1 rounded bg-slate-100"
              style={{ maxWidth: c === 0 ? "none" : `${70 + ((r + c) % 3) * 10}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
