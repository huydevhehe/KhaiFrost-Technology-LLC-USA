"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Info, Loader2, RotateCcw } from "lucide-react";

export interface ConflictNoticeProps {
  /** Vietnamese message, usually from describeContentError. */
  message: string;
  onReload: () => void;
  reloading?: boolean;
  reloadLabel?: string;
  className?: string;
}

/** VERSION_CONFLICT banner with a reload action. */
export function ConflictNotice({
  message,
  onReload,
  reloading = false,
  reloadLabel = "Tải lại bản mới nhất",
  className = "",
}: ConflictNoticeProps) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 ${className}`}
    >
      <AlertTriangle size={18} className="shrink-0 text-amber-500" />
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={onReload}
        disabled={reloading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 focus:ring-2 focus:ring-amber-200 focus:outline-none disabled:opacity-60"
      >
        {reloading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
        {reloadLabel}
      </button>
    </div>
  );
}

export interface InfoNoticeProps {
  children: ReactNode;
  className?: string;
}

/** Neutral explanation strip (e.g. why an action is unavailable). */
export function InfoNotice({ children, className = "" }: InfoNoticeProps) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 ${className}`}
    >
      <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export interface MissingTranslationNoticeProps {
  message: string;
  className?: string;
}

/** 422 TRANSLATION_MISSING explanation listing locale + field. */
export function MissingTranslationNotice({
  message,
  className = "",
}: MissingTranslationNoticeProps) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${className}`}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
      <p className="min-w-0 flex-1">{message}</p>
    </div>
  );
}
