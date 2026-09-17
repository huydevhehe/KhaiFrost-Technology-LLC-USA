"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

export function AboutCta() {
  const { t } = useTranslation();

  return (
    <section className="bg-navy py-14 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            {t("aboutPage.cta.eyebrow")}
          </p>
          <h2 className="text-2xl font-bold sm:text-3xl">
            {t("aboutPage.cta.heading")}
          </h2>
          <p className="mt-2 text-white/70">{t("aboutPage.cta.description")}</p>
        </div>
        <Button href="/lien-he" variant="primary-pill-light">
          {t("aboutPage.cta.button")}
        </Button>
      </div>
    </section>
  );
}
