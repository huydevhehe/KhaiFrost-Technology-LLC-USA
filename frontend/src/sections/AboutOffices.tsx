"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { aboutOfficeImages } from "@/content/aboutPageData";
import { siteConfig } from "@/content/siteConfig";
import { OfficeLocation } from "@/types";

function OfficeCard({ office }: { office: OfficeLocation }) {
  const label = useLocalizedField(office.label);
  const addressParts = [
    office.street,
    [office.city, office.state].filter(Boolean).join(", "),
    office.zip,
  ].filter(Boolean);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm sm:flex">
      <div className="relative h-48 w-full sm:h-auto sm:w-1/2">
        <Image
          src={aboutOfficeImages[office.id]}
          alt={label}
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 p-6">
        <div className="flex items-center gap-2 text-accent">
          <MapPin size={16} />
          <h3 className="font-semibold text-slate-900">{label}</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-500">
          {addressParts.join(", ")}
        </p>
      </div>
    </div>
  );
}

export function AboutOffices() {
  const { t } = useTranslation();

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <SectionEyebrow>{t("aboutPage.offices.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("aboutPage.offices.heading")}</SectionHeading>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
            {t("aboutPage.offices.intro")}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {siteConfig.offices.map((office) => (
            <OfficeCard key={office.id} office={office} />
          ))}
        </div>
      </div>
    </section>
  );
}
