"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconCircle } from "@/components/ui/IconCircle";
import { Button } from "@/components/ui/Button";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { useServices } from "@/lib/content/catalog";
import { useSectionText } from "@/lib/content/pages";
import { ServiceItem } from "@/types";

function ServiceOverviewCard({ service }: { service: ServiceItem }) {
  const { t } = useTranslation();
  const title = useLocalizedField(service.title);
  const description = useLocalizedField(service.description);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3]">
        <Image src={service.image} alt={title} fill className="object-cover" />
        <div className="absolute -bottom-5 left-4 rounded-full bg-white p-1 shadow-md">
          <IconCircle icon={service.icon} />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-8">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 flex-1 text-sm text-slate-500">{description}</p>
        <div className="mt-4">
          <Button href={`/dich-vu/${service.slug}`} variant="primary-blue">
            {t("servicesOverviewPage.services.cta")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ServicesOverviewGrid() {
  const { t } = useTranslation();
  const services = useServices();
  const section = useSectionText("/dich-vu", "core-services");

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <SectionEyebrow>{section("eyebrow", t("servicesOverviewPage.services.eyebrow"))}</SectionEyebrow>
          <SectionHeading>{section("heading", t("servicesOverviewPage.services.heading"))}</SectionHeading>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {services.map((service) => (
            <ServiceOverviewCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
