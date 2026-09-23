"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { useClientLocations } from "@/lib/content/catalog";
import { useSectionText } from "@/lib/content/pages";
import { ClientLocation } from "@/types";

function ClientMarker({ client }: { client: ClientLocation }) {
  const quote = useLocalizedField(client.quote);

  const horizontalAnchor =
    client.x > 70 ? "right-0" : client.x < 20 ? "left-0" : "left-1/2 -translate-x-1/2";
  const verticalAnchor =
    client.y < 20 ? "top-full mt-3" : "bottom-full mb-3";

  return (
    <div
      className="group absolute z-10"
      style={{ left: `${client.x}%`, top: `${client.y}%` }}
    >
      <span className="absolute -left-1.5 -top-1.5 h-3 w-3 animate-ping rounded-full bg-accent/70" />
      <span className="relative block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-accent shadow-[0_0_0_2px_rgba(11,17,32,0.5)]" />

      <div
        className={`pointer-events-none absolute ${horizontalAnchor} ${verticalAnchor} z-20 w-72 overflow-hidden rounded-xl border border-slate-100 bg-white opacity-0 shadow-2xl transition-opacity duration-200 group-hover:opacity-100`}
      >
        <div className="relative h-28 w-full">
          <Image
            src={client.coverImage}
            alt={`${client.role} in ${client.country}`}
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Image
              src={client.avatar}
              alt={client.name}
              width={40}
              height={40}
              unoptimized
              className="rounded-full border-2 border-white object-cover shadow"
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
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            &ldquo;{quote}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

export function GlobalClientsMap() {
  const { t } = useTranslation();
  const clientLocations = useClientLocations();
  const section = useSectionText("/", "global-clients");

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="mb-10 text-center">
          <SectionEyebrow>{section("eyebrow", t("globalClients.eyebrow"))}</SectionEyebrow>
          <SectionHeading>{section("heading", t("globalClients.heading"))}</SectionHeading>
        </div>
        <div className="relative mx-auto aspect-[2/1] w-full overflow-hidden rounded-2xl bg-navy shadow-lg">
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <Image
              src="/images/map/global-reach.jpg"
              alt="Global map showing KhaiFrost client locations around the world"
              fill
              sizes="(max-width: 1600px) 100vw, 1600px"
              className="object-cover"
              priority={false}
            />
          </div>
          {clientLocations.map((client) => (
            <ClientMarker key={client.id} client={client} />
          ))}
        </div>
      </div>
    </section>
  );
}
