"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { SiteHeader } from "./SiteHeader";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-navy text-white">
      <div className="absolute inset-0">
        <Image
          src="/images/hero/banner-3.png"
          alt="KhaiFrost AI-powered development in action"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </div>

      <SiteHeader />

      <div className="relative flex flex-1 items-center">
        <div className="mx-auto w-full max-w-[1800px] px-8 py-24 md:px-12">
          <div className="max-w-2xl md:ml-16 lg:ml-32">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {t("hero.eyebrow")}
            </p>
            <h1 className="text-5xl font-extrabold leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] sm:text-6xl lg:text-7xl">
              {t("hero.headline")}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {t("hero.subtext")}
            </p>
            <div className="mt-8">
              <Button
                variant="primary-blue"
                icon={<Play size={14} fill="currentColor" />}
              >
                {t("hero.cta")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
