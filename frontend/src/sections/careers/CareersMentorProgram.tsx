"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconCircle } from "@/components/ui/IconCircle";
import { Button } from "@/components/ui/Button";
import { useLocalizedField } from "@/lib/useLocalizedField";
import {
  mentorBenefits,
  mentorFitFor,
  mentorProcessSteps,
} from "@/content/careersPageData";
import { LocalizedText, ServiceCategoryProcessStep } from "@/types";

function MentorStepCard({ step }: { step: ServiceCategoryProcessStep }) {
  const title = useLocalizedField(step.title);
  const description = useLocalizedField(step.description);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
          {step.step}
        </span>
        <IconCircle icon={step.icon} />
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ChecklistItem({ item }: { item: LocalizedText }) {
  const text = useLocalizedField(item);
  return (
    <li className="flex items-start gap-2 text-sm text-slate-600">
      <Check size={16} className="mt-0.5 flex-shrink-0 text-accent" />
      <span>{text}</span>
    </li>
  );
}

function ChecklistCard({ heading, items }: { heading: string; items: LocalizedText[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 font-semibold text-slate-900">{heading}</h3>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <ChecklistItem key={index} item={item} />
        ))}
      </ul>
    </div>
  );
}

export function CareersMentorProgram() {
  const { t } = useTranslation();

  return (
    <section id="mentor-program" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-4 max-w-3xl">
          <SectionEyebrow>{t("careersPage.mentor.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("careersPage.mentor.heading")}</SectionHeading>
          <p className="mt-4 text-sm text-slate-500">{t("careersPage.mentor.intro")}</p>
        </div>

        <p className="mb-4 mt-10 text-xs font-semibold uppercase tracking-widest text-slate-400">
          {t("careersPage.mentor.processLabel")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {mentorProcessSteps.map((step) => (
            <MentorStepCard key={step.step} step={step} />
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <ChecklistCard heading={t("careersPage.mentor.benefitsHeading")} items={mentorBenefits} />
          <ChecklistCard heading={t("careersPage.mentor.fitForHeading")} items={mentorFitFor} />
        </div>

        <div className="mt-6 flex justify-end">
          <Button href="/lien-he" variant="primary-blue">
            {t("careersPage.mentor.ctaButton")}
          </Button>
        </div>
      </div>
    </section>
  );
}
