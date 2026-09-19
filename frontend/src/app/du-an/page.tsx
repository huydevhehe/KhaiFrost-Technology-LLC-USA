"use client";

import { useTranslation } from "react-i18next";
import { CategoryBreadcrumb } from "@/sections/CategoryBreadcrumb";
import { CategoryStats } from "@/sections/CategoryStats";
import { ProjectsHero } from "@/sections/ProjectsHero";
import { ProjectsFilterGrid } from "@/sections/ProjectsFilterGrid";
import { ProjectsCta } from "@/sections/ProjectsCta";
import { SiteFooter } from "@/sections/SiteFooter";
import { projectsPageStats } from "@/content/projectsPageData";
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/ui/Reveal";

export default function ProjectsPage() {
  const { t } = useTranslation();

  return (
    <PageTransition>
      <main>
        <ProjectsHero />
        <CategoryBreadcrumb currentLabel={t("projectsPage.breadcrumb.current")} />
        <Reveal>
          <ProjectsFilterGrid />
        </Reveal>
        <Reveal>
          <CategoryStats stats={projectsPageStats} />
        </Reveal>
        <Reveal>
          <ProjectsCta />
        </Reveal>
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
