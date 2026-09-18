"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "@/sections/SiteHeader";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { LocalizedText } from "@/types";

export function CategoryHero({
  title,
  subtitle,
  image,
}: {
  title: LocalizedText;
  subtitle: LocalizedText;
  image: string;
}) {
  const { t } = useTranslation();
  const titleText = useLocalizedField(title);
  const subtitleText = useLocalizedField(subtitle);

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <SiteHeader />
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={titleText}
          fill
          sizes="100vw"
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-navy/40" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-32">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent">
            {t("serviceCategoryPage.hero.eyebrow")}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            {titleText}
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/80">
            {subtitleText}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/demo" variant="outline-dark">
              {t("serviceCategoryPage.hero.ctaDemo")}
            </Button>
            <Button href="/lien-he" variant="outline-dark">
              {t("serviceCategoryPage.hero.ctaContact")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
