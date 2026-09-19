"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSectionText } from "@/lib/content/pages";

export function ServicesOverviewWhyUs() {
  const { t } = useTranslation();
  const section = useSectionText("/dich-vu", "why-us");

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <SectionEyebrow>{section("eyebrow", t("servicesOverviewPage.whyUs.eyebrow"))}</SectionEyebrow>
        <SectionHeading>{section("heading", t("servicesOverviewPage.whyUs.heading"))}</SectionHeading>
        <p className="mx-auto mt-6 max-w-3xl text-xl leading-relaxed text-slate-600">
          {section("intro", t("servicesOverviewPage.whyUs.paragraph"))}
        </p>
      </div>
    </section>
  );
}
