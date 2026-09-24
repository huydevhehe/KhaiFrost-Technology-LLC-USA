"use client";

import { useTranslation } from "react-i18next";
import { CategoryBreadcrumb } from "@/sections/CategoryBreadcrumb";
import { CategoryWhyUs } from "@/sections/CategoryWhyUs";
import { CareersHero } from "@/sections/careers/CareersHero";
import { CareersPaths } from "@/sections/careers/CareersPaths";
import { CareersOpenPositions } from "@/sections/careers/CareersOpenPositions";
import { CareersMentorProgram } from "@/sections/careers/CareersMentorProgram";
import { CareersFaqSection } from "@/sections/careers/CareersFaqSection";
import { SiteFooter } from "@/sections/SiteFooter";
import { careersBenefits } from "@/content/careersPageData";
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/ui/Reveal";

export default function CareersPage() {
  const { t } = useTranslation();

  return (
    <PageTransition>
      <main>
        <CareersHero />
        <CategoryBreadcrumb currentLabel={t("careersPage.breadcrumb.current")} />
        <Reveal>
          <CareersPaths />
        </Reveal>
        <Reveal>
          <CategoryWhyUs
            eyebrow={t("careersPage.benefits.eyebrow")}
            heading={t("careersPage.benefits.heading")}
            items={careersBenefits}
          />
        </Reveal>
        <Reveal>
          <CareersOpenPositions />
        </Reveal>
        <Reveal>
          <CareersMentorProgram />
        </Reveal>
        <Reveal>
          <CareersFaqSection />
        </Reveal>
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
