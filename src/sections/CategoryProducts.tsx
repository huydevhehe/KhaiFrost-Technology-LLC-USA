"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { Pill } from "@/components/ui/Pill";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { LocalizedText, ServiceCategoryProduct } from "@/types";

function ProductCard({ product }: { product: ServiceCategoryProduct }) {
  const { t } = useTranslation();
  const name = useLocalizedField(product.name);
  const description = useLocalizedField(product.description);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <VideoThumbnail src={product.image} alt={name} duration={product.duration} />
      <h3 className="mt-4 font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {product.tags.slice(0, 3).map((tag) => (
          <Pill key={tag} label={tag} />
        ))}
      </div>
      <a
        href={product.href}
        className="mt-4 inline-block text-sm font-medium text-accent"
      >
        {t("serviceCategoryPage.products.viewDetails")}
      </a>
    </div>
  );
}

export function CategoryProducts({
  eyebrow,
  heading,
  intro,
  products,
}: {
  eyebrow: LocalizedText;
  heading: LocalizedText;
  intro: LocalizedText;
  products: ServiceCategoryProduct[];
}) {
  const eyebrowText = useLocalizedField(eyebrow);
  const headingText = useLocalizedField(heading);
  const introText = useLocalizedField(intro);

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionEyebrow>{eyebrowText}</SectionEyebrow>
            <SectionHeading>{headingText}</SectionHeading>
          </div>
          <p className="max-w-sm text-sm text-slate-500">{introText}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
