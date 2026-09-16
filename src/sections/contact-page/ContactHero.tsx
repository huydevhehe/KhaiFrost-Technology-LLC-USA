"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/sections/SiteHeader";

export function ContactHero() {
  const { t } = useTranslation();

  return (
    <section className="relative flex min-h-[65vh] flex-col overflow-hidden bg-navy text-white">
      <div className="absolute inset-0">
        <Image
          src="/images/contact/office-banner.png"
          alt="KhaiFrost office and engineering team at work"
          fill
          sizes="100vw"
          className="object-cover object-right"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/30 to-transparent" />
      </div>

      <SiteHeader />

      <div className="relative flex flex-1 items-center">
        <div className="mx-auto w-full max-w-[1800px] px-8 py-24 md:px-12">
          <div className="max-w-xl md:ml-10 lg:ml-20">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {t("contactPage.hero.eyebrow")}
            </p>
            <h1 className="text-4xl font-extrabold leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] sm:text-5xl lg:text-6xl">
              {t("contactPage.hero.headline")}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {t("contactPage.hero.subtext")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
