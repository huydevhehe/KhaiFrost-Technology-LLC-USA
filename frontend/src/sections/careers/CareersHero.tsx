"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/sections/SiteHeader";
import { Button } from "@/components/ui/Button";

export function CareersHero() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <SiteHeader />
      <div className="absolute inset-0">
        <Image
          src="/images/about/office-1.jpg"
          alt={t("careersPage.hero.imageAlt")}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/70 to-navy/30" />
      </div>

      <div className="relative mx-auto flex min-h-[70vh] max-w-7xl items-center px-6 pb-24 pt-40">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent">
            {t("careersPage.hero.eyebrow")}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            {t("careersPage.hero.headlineLine1")}
            <br />
            {t("careersPage.hero.headlineLine2")}
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/70">
            {t("careersPage.hero.description")}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="#open-positions" variant="primary-blue">
              {t("careersPage.hero.ctaPositions")}
            </Button>
            <Button href="#mentor-program" variant="outline-dark">
              {t("careersPage.hero.ctaMentor")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
