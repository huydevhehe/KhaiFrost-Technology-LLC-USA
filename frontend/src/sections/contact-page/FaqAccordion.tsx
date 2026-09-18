"use client";

import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";

const faqIndexes = [1, 2, 3, 4];

export function FaqAccordion() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <SectionEyebrow>{t("contactPage.faq.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("contactPage.faq.heading")}</SectionHeading>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {faqIndexes.map((i) => (
            <details
              key={i}
              className="group rounded-lg border border-slate-200 px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-900">
                {t(`contactPage.faq.q${i}`)}
                <Plus
                  size={16}
                  className="flex-shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-45"
                />
              </summary>
              <p className="mt-3 text-sm text-slate-500">
                {t(`contactPage.faq.a${i}`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
