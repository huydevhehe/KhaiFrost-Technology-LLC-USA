"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconCircle } from "@/components/ui/IconCircle";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { whyUsItems } from "@/content/whyUsItems";
import { WhyUsItem } from "@/types";

function WhyUsCard({ item }: { item: WhyUsItem }) {
  const title = useLocalizedField(item.title);
  const description = useLocalizedField(item.description);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <IconCircle icon={item.icon} />
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function WhyChooseUs() {
  const { t } = useTranslation();

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionEyebrow>{t("whyChooseUs.eyebrow")}</SectionEyebrow>
            <SectionHeading>{t("whyChooseUs.heading")}</SectionHeading>
          </div>
          <p className="max-w-sm text-sm text-slate-500">
            {t("whyChooseUs.intro")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {whyUsItems.map((item) => (
            <WhyUsCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
