"use client";

import { MapPin, Briefcase, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { openPositions, type OpenPosition } from "@/content/careersPageData";

function PositionCard({ position }: { position: OpenPosition }) {
  const { t } = useTranslation();
  const title = useLocalizedField(position.title);
  const department = useLocalizedField(position.department);
  const location = useLocalizedField(position.location);
  const type = useLocalizedField(position.type);

  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Briefcase size={14} /> {department}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} /> {location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} /> {type}
          </span>
        </div>
      </div>
      <Button href="/lien-he" variant="primary-blue">
        {t("careersPage.positions.applyButton")}
      </Button>
    </div>
  );
}

export function CareersOpenPositions() {
  const { t } = useTranslation();

  return (
    <section id="open-positions" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8">
          <SectionEyebrow>{t("careersPage.positions.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("careersPage.positions.heading")}</SectionHeading>
        </div>
        {openPositions.length > 0 ? (
          <div className="flex flex-col gap-4">
            {openPositions.map((position) => (
              <PositionCard key={position.id} position={position} />
            ))}
          </div>
        ) : null}
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-6 text-center text-sm text-slate-500">
          {t("careersPage.positions.empty")}
        </p>
      </div>
    </section>
  );
}
