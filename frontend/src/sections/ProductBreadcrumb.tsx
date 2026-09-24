"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/sections/SiteHeader";

export function ProductBreadcrumb({
  categoryName,
  categorySlug,
  productName,
}: {
  categoryName: string | null;
  categorySlug: string | null;
  productName: string;
}) {
  const { t } = useTranslation();

  return (
    <section className="relative bg-white">
      <SiteHeader />
      <nav className="mx-auto max-w-7xl px-6 pb-4 pt-28 text-sm text-slate-500 sm:pt-32">
        <Link href="/" className="hover:text-slate-700">
          {t("productDetailPage.breadcrumb.home")}
        </Link>
        <span className="mx-2">/</span>
        <span>{t("productDetailPage.breadcrumb.products")}</span>
        {categoryName && (
          <>
            <span className="mx-2">/</span>
            {categorySlug ? (
              <Link href={`/dich-vu/${categorySlug}`} className="hover:text-slate-700">
                {categoryName}
              </Link>
            ) : (
              <span>{categoryName}</span>
            )}
          </>
        )}
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-900">{productName}</span>
      </nav>
    </section>
  );
}
