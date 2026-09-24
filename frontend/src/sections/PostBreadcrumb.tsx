"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export function PostBreadcrumb({
  categoryName,
  postTitle,
}: {
  categoryName: string | null;
  postTitle: string;
}) {
  const { t } = useTranslation();

  return (
    <nav className="border-b border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-3 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-700">
          {t("postDetailPage.breadcrumb.home")}
        </Link>
        <span className="mx-2">/</span>
        <Link href="/bai-viet" className="hover:text-slate-700">
          {t("postDetailPage.breadcrumb.posts")}
        </Link>
        {categoryName && (
          <>
            <span className="mx-2">/</span>
            <span className="hover:text-slate-700">{categoryName}</span>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-900">{postTitle}</span>
      </div>
    </nav>
  );
}
