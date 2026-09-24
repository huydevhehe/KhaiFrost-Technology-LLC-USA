"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useContentLocale } from "@/lib/content/store";
import { formatPostDetailDate, type PublicPostListItem } from "@/lib/content/postDetail";

export function PostSidebar({
  tags,
  related,
}: {
  tags: string[];
  related: PublicPostListItem[];
}) {
  const { t } = useTranslation();
  const locale = useContentLocale();

  if (tags.length === 0 && related.length === 0) return null;

  return (
    <aside className="space-y-6">
      {tags.length > 0 && (
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            {t("postDetailPage.sidebar.topics")}
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && (
        <div className="rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            {t("postDetailPage.sidebar.related")}
          </h3>
          <ul className="mt-4 space-y-4">
            {related.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/bai-viet/${item.slug}`}
                  className="block text-sm font-medium text-slate-800 hover:text-accent"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-slate-400">
                  {formatPostDetailDate(item.publishedAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
