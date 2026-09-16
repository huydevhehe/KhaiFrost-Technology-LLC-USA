"use client";

import { Zap, Clock, Headset } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";

const cards = [
  { icon: Zap, titleKey: "responseTitle", descKey: "responseDesc" },
  { icon: Clock, titleKey: "hoursTitle", descKey: "hoursDesc" },
  { icon: Headset, titleKey: "supportTitle", descKey: "supportDesc" },
] as const;

export function AvailabilityCards() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <SectionEyebrow>{t("contactPage.availability.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("contactPage.availability.heading")}</SectionHeading>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {cards.map(({ icon: Icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                {t(`contactPage.availability.${titleKey}`)}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {t(`contactPage.availability.${descKey}`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
