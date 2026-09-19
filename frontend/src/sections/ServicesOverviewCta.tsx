"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { useSectionText } from "@/lib/content/pages";

export function ServicesOverviewCta() {
  const { t } = useTranslation();
  const section = useSectionText("/dich-vu", "cta");

  return (
    <section className="bg-navy py-14 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            {section("eyebrow", t("servicesOverviewPage.cta.eyebrow"))}
          </p>
          <h2 className="text-2xl font-bold sm:text-3xl">
            {section("heading", t("servicesOverviewPage.cta.heading"))}
          </h2>
          <p className="mt-2 text-white/70">
            {section("description", t("servicesOverviewPage.cta.description"))}
          </p>
        </div>
        <Button href="/lien-he" variant="primary-pill-light">
          {section("buttonLabel", t("servicesOverviewPage.cta.button"))}
        </Button>
      </div>
    </section>
  );
}
