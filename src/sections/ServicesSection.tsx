"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconCircle } from "@/components/ui/IconCircle";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { services } from "@/content/services";
import { ServiceItem } from "@/types";

function ServiceCard({ service }: { service: ServiceItem }) {
  const title = useLocalizedField(service.title);
  const description = useLocalizedField(service.description);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="relative aspect-[4/3]">
        <Image src={service.image} alt={title} fill className="object-cover" />
        <div className="absolute -bottom-5 left-5">
          <div className="rounded-full bg-white p-1 shadow-md">
            <IconCircle icon={service.icon} />
          </div>
        </div>
      </div>
      <div className="p-5 pt-8">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function ServicesSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <SectionEyebrow>{t("services.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("services.heading")}</SectionHeading>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
