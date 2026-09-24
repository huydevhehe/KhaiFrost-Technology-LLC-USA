"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatMoney } from "@/lib/format";
import type { ProductCardSummary } from "@/lib/content/productDetail";
import type { ProductType } from "@/lib/api/types";

const TYPE_LABELS: Record<ProductType, string> = {
  source_code: "Mã nguồn",
  hosting_plan: "Gói hosting",
  live_demo: "Bản demo trực tiếp",
  other: "Khác",
};

function RelatedProductCard({ product }: { product: ProductCardSummary }) {
  const defaultPrice = product.prices.find((price) => price.isDefault) ?? product.prices[0];

  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className="block overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-video bg-slate-100">
        {product.coverImageUrl && (
          <Image src={product.coverImageUrl} alt={product.name} fill className="object-cover" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow">
          {TYPE_LABELS[product.type]}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-slate-900">{product.name}</h3>
        {product.tagline && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.tagline}</p>}
        <p className="mt-2 text-sm font-semibold text-accent">
          {product.priceOnRequest || !defaultPrice
            ? "Liên hệ báo giá"
            : formatMoney(defaultPrice.amount, defaultPrice.currency)}
        </p>
      </div>
    </Link>
  );
}

export function ProductRelated({ related }: { related: ProductCardSummary[] }) {
  const { t } = useTranslation();

  if (related.length === 0) return null;

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading className="mb-2">{t("productDetailPage.sections.related")}</SectionHeading>
        <p className="mb-8 text-sm text-slate-500">{t("productDetailPage.related.intro")}</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {related.slice(0, 4).map((product) => (
            <RelatedProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
