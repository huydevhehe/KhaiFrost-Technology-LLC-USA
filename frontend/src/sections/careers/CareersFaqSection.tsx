"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { careersFaqMentor, careersFaqRecruitment } from "@/content/careersPageData";
import { siteConfig } from "@/content/siteConfig";
import { ServiceCategoryFaqItem } from "@/types";

function FaqAccordionItem({ item }: { item: ServiceCategoryFaqItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const question = useLocalizedField(item.question);
  const answer = useLocalizedField(item.answer);

  return (
    <div className="rounded-lg border border-slate-200 px-5 py-4">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 text-left text-sm font-medium text-slate-900"
      >
        {question}
        <Plus
          size={16}
          className={`flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-45" : ""
          }`}
        />
      </button>
      {isOpen && <p className="mt-3 text-sm text-slate-500">{answer}</p>}
    </div>
  );
}

function FaqColumn({ label, items }: { label: string; items: ServiceCategoryFaqItem[] }) {
  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="space-y-4">
        {items.map((item, index) => (
          <FaqAccordionItem key={index} item={item} />
        ))}
      </div>
    </div>
  );
}

export function CareersFaqSection() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <SectionEyebrow>{t("careersPage.faq.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("careersPage.faq.heading")}</SectionHeading>
        </div>
        <div className="grid gap-8 md:grid-cols-[1fr_1fr_0.85fr]">
          <FaqColumn label={t("careersPage.faq.recruitmentLabel")} items={careersFaqRecruitment} />
          <FaqColumn label={t("careersPage.faq.mentorLabel")} items={careersFaqMentor} />

          <div className="h-fit rounded-xl bg-slate-50 p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
              {t("careersPage.faq.cta.eyebrow")}
            </p>
            <h3 className="text-lg font-bold text-slate-900">{t("careersPage.faq.cta.heading")}</h3>
            <p className="mt-2 text-sm text-slate-500">{t("careersPage.faq.cta.text")}</p>
            <div className="mt-5 flex flex-col gap-3">
              <Button href="/lien-he" variant="primary-blue">
                {t("careersPage.faq.cta.primaryCta")}
              </Button>
              <Link
                href={`mailto:${siteConfig.email}`}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Mail size={16} />
                {t("careersPage.faq.cta.secondaryCta")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
