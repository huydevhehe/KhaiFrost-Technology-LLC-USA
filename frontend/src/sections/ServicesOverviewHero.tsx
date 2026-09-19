"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { headlineLines, sectionImageUrl, useSection, useSectionText } from "@/lib/content/pages";
import { SiteHeader } from "@/sections/SiteHeader";

export function ServicesOverviewHero() {
  const { t } = useTranslation();
  const hero = useSectionText("/dich-vu", "hero");
  const heroImage = sectionImageUrl(useSection("/dich-vu", "hero"), "backgroundImage") ?? "/images/services-overview/hero.jpg";
  const headline = headlineLines(
    hero("headline", `${t("servicesOverviewPage.hero.headlineLine1")} ${t("servicesOverviewPage.hero.headlineLine2")}`),
    t("servicesOverviewPage.hero.headlineLine1"),
    t("servicesOverviewPage.hero.headlineLine2"),
  );

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <SiteHeader />
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt={t("servicesOverviewPage.hero.imageAlt")}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/60 to-navy/20" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 pb-32 pt-40">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent">
            {hero("eyebrow", t("servicesOverviewPage.hero.eyebrow"))}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            {headline.line1}
            {headline.line2 !== null && (
              <>
                <br />
                {headline.line2}
              </>
            )}
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/70">
            {hero("description", t("servicesOverviewPage.hero.description"))}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="/demo" variant="outline-dark">
              {hero("primaryCtaLabel", t("servicesOverviewPage.hero.ctaDemo"))}
            </Button>
            <Button href="/lien-he" variant="outline-dark">
              {hero("secondaryCtaLabel", t("servicesOverviewPage.hero.ctaContact"))}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
