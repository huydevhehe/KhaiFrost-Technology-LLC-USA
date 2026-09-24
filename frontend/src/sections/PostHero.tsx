"use client";

import Image from "next/image";
import { Calendar, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/sections/SiteHeader";

export function PostHero({
  categoryName,
  title,
  coverImageUrl,
  dateLabel,
  readingTimeMinutes,
}: {
  categoryName: string;
  title: string;
  coverImageUrl: string | null;
  dateLabel: string;
  readingTimeMinutes: number;
}) {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <SiteHeader />
      {coverImageUrl && (
        <div className="absolute inset-0">
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes="100vw"
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-navy/40" />
        </div>
      )}

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-32">
        <div className="max-w-2xl">
          {categoryName && (
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-accent">
              {categoryName}
            </p>
          )}
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-white/70">
            {dateLabel && (
              <span className="inline-flex items-center gap-2">
                <Calendar size={16} />
                {dateLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              <Clock size={16} />
              {t("postDetailPage.hero.readingTime", { count: readingTimeMinutes })}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
