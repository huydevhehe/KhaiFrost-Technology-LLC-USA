"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { siteConfig } from "@/content/siteConfig";
import { OfficeLocation } from "@/types";

const stats = [
  { value: "50+", labelKey: "statClients" },
  { value: "10+", labelKey: "statCountries" },
  { value: "5★", labelKey: "statSatisfaction" },
] as const;

function ReachPin({ office }: { office: OfficeLocation }) {
  const label = useLocalizedField(office.label);

  return (
    <div
      className="group absolute z-10"
      style={{ left: `${office.x}%`, top: `${office.y}%` }}
    >
      <span className="absolute -left-2.5 -top-2.5 h-5 w-5 animate-ping rounded-full bg-accent/70" />
      <span className="relative block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-[0_0_0_3px_rgba(11,17,32,0.4)]" />
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-800 opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100">
        {label}
      </div>
    </div>
  );
}

export function OurReach() {
  const { t } = useTranslation();

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 md:grid-cols-2">
        <div>
          <SectionEyebrow>{t("contactPage.reach.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("contactPage.reach.heading")}</SectionHeading>
          <p className="mt-4 text-slate-500">{t("contactPage.reach.paragraph")}</p>
          <div className="mt-6 flex gap-8">
            {stats.map((stat) => (
              <div key={stat.labelKey}>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">
                  {t(`contactPage.reach.${stat.labelKey}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl shadow-lg">
          <Image
            src="/images/map/earth-blue-marble.jpg"
            alt="Map showing KhaiFrost office locations worldwide"
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            className="object-cover"
          />
          {siteConfig.offices.map((office) => (
            <ReachPin key={office.id} office={office} />
          ))}
        </div>
      </div>
    </section>
  );
}
