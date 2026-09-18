"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { services } from "@/content/services";
import { ServiceItem } from "@/types";

function ServiceCard({ service }: { service: ServiceItem }) {
  const title = useLocalizedField(service.title);
  const description = useLocalizedField(service.description);

  return (
    <Link
      href={`/dich-vu/${service.slug}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-xl border border-slate-100 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-accent/20 hover:shadow-[0_25px_50px_-15px_rgba(14,165,233,0.35)]"
    >
      <Image
        src={service.image}
        alt={title}
        fill
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-white/45 px-5 py-2 backdrop-blur-none transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:bg-white/70 group-hover:py-5 group-hover:backdrop-blur-md">
        <span className="mb-0 block h-0.5 w-0 rounded-full bg-accent transition-all duration-500 ease-out group-hover:mb-2 group-hover:w-10" />
        <h3 className="font-semibold text-slate-900 [text-shadow:0_1px_4px_rgba(255,255,255,0.9)]">
          {title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-800 [text-shadow:0_1px_4px_rgba(255,255,255,0.9)]">
          {description}
        </p>
      </div>
    </Link>
  );
}

export function ServicesSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="mb-10 text-center">
          <p className="text-lg font-semibold uppercase tracking-widest text-accent sm:text-xl">
            {t("services.eyebrow")}
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
