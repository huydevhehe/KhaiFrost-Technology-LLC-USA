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
import { useSectionText } from "@/lib/content/pages";
import { useServicesOverview } from "@/lib/content/serviceDetail";

export function ServicesOverviewPage() {
  const { t } = useTranslation();
  const { stats, steps } = useServicesOverview();
  const process = useSectionText("/dich-vu", "process");

  return (
    <>
      <ServicesOverviewHero />
      <CategoryBreadcrumb />
      <Reveal>
        <CategoryStats stats={stats} />
      </Reveal>
      <Reveal>
        <ServicesOverviewGrid />
      </Reveal>
      <Reveal>
        <ServicesOverviewProjects />
      </Reveal>
      <Reveal>
        <CategoryProcess
          eyebrow={process("eyebrow", t("servicesOverviewPage.process.eyebrow"))}
          heading={process("heading", t("servicesOverviewPage.process.heading"))}
          steps={steps}
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
