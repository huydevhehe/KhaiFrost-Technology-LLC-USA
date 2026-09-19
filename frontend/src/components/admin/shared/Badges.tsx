"use client";

import { Languages } from "lucide-react";
import { formatDateTime, isFuture } from "./format";
import { LOCALE_SHORT_LABELS, type Locale, type PublicationStatus } from "./types";

type BadgeState = PublicationStatus | "scheduled";

const STATUS_LABELS: Record<BadgeState, string> = {
  draft: "Bản nháp",
  in_review: "Chờ duyệt",
  published: "Đã xuất bản",
  scheduled: "Đã lên lịch",
  archived: "Lưu trữ",
};

const STATUS_CLASSES: Record<BadgeState, string> = {
  draft: "bg-slate-100 text-slate-600",
  in_review: "bg-amber-50 text-amber-600",
  published: "bg-emerald-50 text-emerald-600",
  scheduled: "bg-sky-50 text-sky-600",
  archived: "bg-slate-200 text-slate-500",
};

export interface PublicationBadgeProps {
  status: PublicationStatus;
  /** When the status is `published` and this is in the future, the badge reads "Đã lên lịch". */
  publishedAt?: string | null;
  className?: string;
}

/** Vietnamese badge for the publication workflow, with a scheduled variant. */
export function PublicationBadge({ status, publishedAt, className = "" }: PublicationBadgeProps) {
  const state: BadgeState = status === "published" && isFuture(publishedAt) ? "scheduled" : status;
  const title = state === "scheduled" && publishedAt ? `Xuất bản lúc ${formatDateTime(publishedAt)}` : undefined;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[state]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[state]}
    </span>
  );
}

/** Label of a publication state without the badge chrome. */
export function publicationStatusLabel(status: PublicationStatus, publishedAt?: string | null): string {
  return STATUS_LABELS[status === "published" && isFuture(publishedAt) ? "scheduled" : status];
}

export interface MissingLocalesBadgeProps {
  /** Locales whose required fields are still empty. Nothing renders when empty. */
  locales: readonly Locale[];
  className?: string;
}

/** "Thiếu bản dịch: EN" — hidden when every locale is complete. */
export function MissingLocalesBadge({ locales, className = "" }: MissingLocalesBadgeProps) {
  if (locales.length === 0) return null;
  const names = locales.map((locale) => LOCALE_SHORT_LABELS[locale]).join(", ");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ${className}`}
    >
      <Languages size={13} />
      Thiếu bản dịch: {names}
    </span>
  );
}
