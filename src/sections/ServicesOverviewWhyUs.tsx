"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function ServicesOverviewWhyUs() {
  const { t } = useTranslation();

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <SectionEyebrow>{t("servicesOverviewPage.whyUs.eyebrow")}</SectionEyebrow>
        <SectionHeading>{t("servicesOverviewPage.whyUs.heading")}</SectionHeading>
        <p className="mx-auto mt-6 max-w-3xl text-xl leading-relaxed text-slate-600">
          {t("servicesOverviewPage.whyUs.paragraph")}
        </p>
      </div>
    </section>
  );
}
