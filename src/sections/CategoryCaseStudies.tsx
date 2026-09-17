"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { Pill } from "@/components/ui/Pill";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { ServiceCategoryCaseStudy } from "@/types";

function CaseStudyCard({ caseStudy }: { caseStudy: ServiceCategoryCaseStudy }) {
  const name = useLocalizedField(caseStudy.name);
  const description = useLocalizedField(caseStudy.description);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <VideoThumbnail
        src={caseStudy.image}
        alt={name}
        duration={caseStudy.duration}
      />
      <h3 className="mt-4 font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {caseStudy.tags.slice(0, 3).map((tag) => (
          <Pill key={tag} label={tag} />
        ))}
      </div>
    </div>
  );
}

export function CategoryCaseStudies({
  eyebrow,
  heading,
  caseStudies,
}: {
  eyebrow: string;
  heading: string;
  caseStudies: ServiceCategoryCaseStudy[];
}) {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <SectionEyebrow>{eyebrow}</SectionEyebrow>
            <SectionHeading>{heading}</SectionHeading>
          </div>
          <a href="#" className="text-sm font-medium text-accent">
            {t("serviceCategoryPage.caseStudies.viewAll")}
          </a>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {caseStudies.map((caseStudy) => (
            <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
          ))}
        </div>
      </div>
    </section>
  );
}
