"use client";

import Image from "next/image";
import { useSection } from "@/lib/content/pages";
import { asArray, text } from "@/lib/content/store";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";

const stats = [
  { value: "50+", labelKey: "statClients" },
  { value: "10+", labelKey: "statCountries" },
  { value: "5★", labelKey: "statSatisfaction" },
] as const;

interface ReachItemDto {
  id?: string;
  value?: string;
  label?: string;
}

export function OurReach() {
  const { t } = useTranslation();
  const section = useSection("/lien-he", "reach");
  const apiItems = asArray<ReachItemDto>(section.items);
  const list =
    apiItems.length > 0
      ? apiItems.map((item, index) => ({
          key: text(item.id, `stat-${index}`),
          value: text(item.value, stats[index]?.value ?? ""),
          label: text(item.label, stats[index] ? t(`contactPage.reach.${stats[index].labelKey}`) : ""),
        }))
      : stats.map((stat) => ({
          key: stat.labelKey,
          value: stat.value,
          label: t(`contactPage.reach.${stat.labelKey}`),
        }));

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:grid-cols-2">
        <div>
          <SectionEyebrow>{text(section.eyebrow, t("contactPage.reach.eyebrow"))}</SectionEyebrow>
          <SectionHeading>{text(section.heading, t("contactPage.reach.heading"))}</SectionHeading>
          <p className="mt-4 text-slate-500">{text(section.description, t("contactPage.reach.paragraph"))}</p>
          <div className="mt-6 flex gap-8">
            {list.map((stat) => (
              <div key={stat.key}>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl bg-navy shadow-lg">
          <Image
            src="/images/map/global-reach.jpg"
            alt="Global map showing KhaiFrost offices in Houston and Ho Chi Minh City"
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
