"use client";

import { Zap, Clock, Headset } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSection } from "@/lib/content/pages";
import { asArray, text } from "@/lib/content/store";

const cards = [
  { icon: Zap, titleKey: "responseTitle", descKey: "responseDesc" },
  { icon: Clock, titleKey: "hoursTitle", descKey: "hoursDesc" },
  { icon: Headset, titleKey: "supportTitle", descKey: "supportDesc" },
] as const;

interface AvailabilityItemDto {
  id?: string;
  title?: string;
  description?: string;
}

export function AvailabilityCards() {
  const { t } = useTranslation();
  const section = useSection("/lien-he", "availability");
  const apiItems = asArray<AvailabilityItemDto>(section.items);

  // Icons stay tied to the card position; text comes from the page composition when it is set.
  const list =
    apiItems.length > 0
      ? apiItems.map((item, index) => {
          const base = cards[index % cards.length];
          return {
            key: text(item.id, `card-${index}`),
            Icon: base.icon,
            title: text(item.title, t(`contactPage.availability.${base.titleKey}`)),
            description: text(item.description, t(`contactPage.availability.${base.descKey}`)),
          };
        })
      : cards.map((card) => ({
          key: card.titleKey,
          Icon: card.icon,
          title: t(`contactPage.availability.${card.titleKey}`),
          description: t(`contactPage.availability.${card.descKey}`),
        }));

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <SectionEyebrow>{text(section.eyebrow, t("contactPage.availability.eyebrow"))}</SectionEyebrow>
          <SectionHeading>{text(section.heading, t("contactPage.availability.heading"))}</SectionHeading>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {list.map(({ key, Icon, title, description }) => (
            <div
              key={key}
              className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
