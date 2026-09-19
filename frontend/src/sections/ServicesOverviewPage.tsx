"use client";

import { useTranslation } from "react-i18next";
import { CategoryBreadcrumb } from "@/sections/CategoryBreadcrumb";
import { CategoryStats } from "@/sections/CategoryStats";
import { CategoryProcess } from "@/sections/CategoryProcess";
import { ServicesOverviewHero } from "@/sections/ServicesOverviewHero";
import { ServicesOverviewGrid } from "@/sections/ServicesOverviewGrid";
import { ServicesOverviewWhyUs } from "@/sections/ServicesOverviewWhyUs";
import { ServicesOverviewProjects } from "@/sections/ServicesOverviewProjects";
import { ServicesOverviewCta } from "@/sections/ServicesOverviewCta";
import { Reveal } from "@/components/ui/Reveal";
import {
  servicesOverviewProcessSteps,
  servicesOverviewStats,
} from "@/content/servicesOverviewPageData";

export function ServicesOverviewPage() {
  const { t } = useTranslation();

  return (
    <>
      <ServicesOverviewHero />
      <CategoryBreadcrumb />
      <Reveal>
        <CategoryStats stats={servicesOverviewStats} />
      </Reveal>
      <Reveal>
        <ServicesOverviewGrid />
      </Reveal>
      <Reveal>
        <ServicesOverviewProjects />
      </Reveal>
      <Reveal>
        <CategoryProcess
          eyebrow={t("servicesOverviewPage.process.eyebrow")}
          heading={t("servicesOverviewPage.process.heading")}
          steps={servicesOverviewProcessSteps}
        />
      </Reveal>
      <Reveal>
        <ServicesOverviewWhyUs />
      </Reveal>
      <Reveal>
        <ServicesOverviewCta />
      </Reveal>
    </>
  );
}
