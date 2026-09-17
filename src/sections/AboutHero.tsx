"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/sections/SiteHeader";

export function AboutHero() {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <SiteHeader />
      <div className="absolute inset-0">
        <Image
          src="/images/about/hero.png"
          alt={t("aboutPage.hero.imageAlt")}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/60 to-navy/20" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 pb-32 pt-40">
        <div className="max-w-2xl -ml-2 sm:-ml-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent">
            {t("aboutPage.hero.eyebrow")}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            {t("aboutPage.hero.headlineLine1")}
            <br />
            {t("aboutPage.hero.headlineLine2")}
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/70">
            {t("aboutPage.hero.description")}
          </p>
        </div>
      </div>
    </section>
  );
}
