"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentLocale } from "@/lib/content/store";
import { formatPostDetailDate, type PublicPostNeighbor } from "@/lib/content/postDetail";

function NeighborCard({
  neighbor,
  label,
}: {
  neighbor: PublicPostNeighbor;
  label: string;
}) {
  const locale = useContentLocale();

  return (
    <Link
      href={`/bai-viet/${neighbor.slug}`}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition-colors hover:border-accent/40"
    >
      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <FileText size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{label}</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{neighbor.title}</p>
        <p className="mt-1 text-xs text-slate-400">{formatPostDetailDate(neighbor.publishedAt, locale)}</p>
      </div>
    </Link>
  );
}

export function PostNeighborNav({
  previous,
  next,
}: {
  previous: PublicPostNeighbor | null;
  next: PublicPostNeighbor | null;
}) {
  const { t } = useTranslation();

  if (!previous && !next) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {previous ? (
        <NeighborCard neighbor={previous} label={t("postDetailPage.neighborNav.previous")} />
      ) : (
        <div />
      )}
      {next && <NeighborCard neighbor={next} label={t("postDetailPage.neighborNav.next")} />}
    </div>
  );
}
