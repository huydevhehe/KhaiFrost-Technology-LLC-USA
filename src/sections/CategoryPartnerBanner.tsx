"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { ServiceCategoryPartnerBanner } from "@/types";

export function CategoryPartnerBanner({
  banner,
}: {
  banner: ServiceCategoryPartnerBanner;
}) {
  const label = useLocalizedField(banner.label);
  const heading = useLocalizedField(banner.heading);
  const text = useLocalizedField(banner.text);
  const ctaLabel = useLocalizedField(banner.ctaLabel);

  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-2xl bg-navy text-white">
          <div className="absolute inset-y-0 right-0 w-1/2">
            <Image
              src={banner.image}
              alt={heading}
              fill
              sizes="50vw"
              className="object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/70 to-transparent" />
          </div>
          <div className="relative flex flex-col items-start gap-4 px-8 py-10 sm:flex-row sm:items-center sm:justify-between md:px-12">
            <div className="max-w-lg">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
                {label}
              </p>
              <h3 className="text-xl font-bold sm:text-2xl">{heading}</h3>
              <p className="mt-2 text-sm text-white/70">{text}</p>
            </div>
            <Button href={banner.ctaHref} variant="primary-pill-light">
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
