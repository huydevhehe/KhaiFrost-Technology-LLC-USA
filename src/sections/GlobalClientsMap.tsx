"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { clientLocations } from "@/content/clientLocations";
import { ClientLocation } from "@/types";

function ClientMarker({ client }: { client: ClientLocation }) {
  const quote = useLocalizedField(client.quote);

  return (
    <div
      className="group absolute z-10"
      style={{ left: `${client.x}%`, top: `${client.y}%` }}
    >
      <span className="absolute -left-2.5 -top-2.5 h-5 w-5 animate-ping rounded-full bg-accent/70" />
      <span className="relative block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-[0_0_0_3px_rgba(11,17,32,0.4)]" />

      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 w-64 -translate-x-1/2 rounded-xl border border-slate-100 bg-white p-4 opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100">
        <div className="flex items-center gap-3">
          <Image
            src={client.avatar}
            alt={client.name}
            width={40}
            height={40}
            unoptimized
            className="rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {client.name}
            </p>
            <p className="text-xs text-slate-500">
              {client.role} · {client.country}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          &ldquo;{quote}&rdquo;
        </p>
      </div>
    </div>
  );
}

export function GlobalClientsMap() {
  const { t } = useTranslation();

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <SectionEyebrow>{t("globalClients.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("globalClients.heading")}</SectionHeading>
        </div>
        <div className="relative mx-auto aspect-[2/1] w-full overflow-hidden rounded-2xl shadow-lg">
          <Image
            src="/images/map/earth-blue-marble.jpg"
            alt="Earth map showing KhaiFrost client locations around the world"
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
            priority={false}
          />
          {clientLocations.map((client) => (
            <ClientMarker key={client.id} client={client} />
          ))}
        </div>
      </div>
    </section>
  );
}
