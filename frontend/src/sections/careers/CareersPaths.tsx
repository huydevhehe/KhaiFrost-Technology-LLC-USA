"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconCircle } from "@/components/ui/IconCircle";
import { Button } from "@/components/ui/Button";

export function CareersPaths() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8">
          <SectionEyebrow>{t("careersPage.paths.eyebrow")}</SectionEyebrow>
          <SectionHeading>{t("careersPage.paths.heading")}</SectionHeading>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <IconCircle icon="briefcase" />
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              {t("careersPage.paths.recruitment.title")}
            </h3>
            <p className="mt-3 text-sm text-slate-500">
              {t("careersPage.paths.recruitment.body")}
            </p>
            <div className="mt-6">
              <Button href="#open-positions" variant="primary-blue">
                {t("careersPage.paths.recruitment.cta")}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <IconCircle icon="users" />
            <h3 className="mt-4 flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
              {t("careersPage.paths.mentor.title")}
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold uppercase text-accent">
                {t("careersPage.paths.mentor.badge")}
              </span>
            </h3>
            <p className="mt-3 text-sm text-slate-500">
              {t("careersPage.paths.mentor.body")}
            </p>
            <div className="mt-6">
              <Button href="#mentor-program" variant="primary-blue">
                {t("careersPage.paths.mentor.cta")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
