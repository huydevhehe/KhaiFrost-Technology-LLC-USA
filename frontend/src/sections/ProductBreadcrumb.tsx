"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/sections/SiteHeader";

export function ProductBreadcrumb({
  categoryName,
  categorySlug,
  productName,
  tagline,
  coverImageUrl,
}: {
  categoryName: string | null;
  categorySlug: string | null;
  productName: string;
  tagline: string | null;
  coverImageUrl: string | null;
}) {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <SiteHeader />
      {coverImageUrl && (
        <div className="absolute inset-0">
          <Image
            src={coverImageUrl}
            alt={productName}
            fill
            sizes="100vw"
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-navy/40" />
        </div>
      )}

      <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-28 sm:pt-32">
        <nav className="mb-6 text-sm text-white/60">
          <Link href="/" className="hover:text-white">
            {t("productDetailPage.breadcrumb.home")}
          </Link>
          <span className="mx-2">/</span>
          <span>{t("productDetailPage.breadcrumb.products")}</span>
          {categoryName && (
            <>
              <span className="mx-2">/</span>
              {categorySlug ? (
                <Link href={`/dich-vu/${categorySlug}`} className="hover:text-white">
                  {categoryName}
                </Link>
              ) : (
                <span>{categoryName}</span>
              )}
            </>
          )}
          <span className="mx-2">/</span>
          <span className="font-medium text-white">{productName}</span>
        </nav>

        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            {productName}
          </h1>
          {tagline && <p className="mt-5 max-w-xl text-base text-white/80">{tagline}</p>}
        </div>
      </div>
    </section>
  );
}
