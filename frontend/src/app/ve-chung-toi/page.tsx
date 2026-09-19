"use client";

import { useTranslation } from "react-i18next";
import { CategoryBreadcrumb } from "@/sections/CategoryBreadcrumb";
import { CategoryStats } from "@/sections/CategoryStats";
import { CategoryWhyUs } from "@/sections/CategoryWhyUs";
import { AboutHero } from "@/sections/AboutHero";
import { AboutStory } from "@/sections/AboutStory";
import { AboutVisionMission } from "@/sections/AboutVisionMission";
import { AboutTeam } from "@/sections/AboutTeam";
import { AboutOffices } from "@/sections/AboutOffices";
import { AboutCta } from "@/sections/AboutCta";
import { SiteFooter } from "@/sections/SiteFooter";
import { aboutStats, aboutValues } from "@/content/aboutPageData";
import { usePageCards, usePageStats, useSectionText } from "@/lib/content/pages";
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/ui/Reveal";

export default function AboutPage() {
  const { t } = useTranslation();
  const stats = usePageStats("/ve-chung-toi", "stats", aboutStats);
  const values = usePageCards("/ve-chung-toi", "values", aboutValues);
  const valuesText = useSectionText("/ve-chung-toi", "values");

  return (
    <PageTransition>
      <main>
        <AboutHero />
        <CategoryBreadcrumb currentLabel={t("aboutPage.breadcrumb.current")} />
        <Reveal>
          <AboutStory />
        </Reveal>
        <Reveal>
          <CategoryStats stats={stats} />
        </Reveal>
        <Reveal>
          <AboutVisionMission />
        </Reveal>
        <Reveal>
          <CategoryWhyUs
            eyebrow={valuesText("eyebrow", t("aboutPage.values.eyebrow"))}
            heading={valuesText("heading", t("aboutPage.values.heading"))}
            items={values}
          />
        </Reveal>
        <Reveal>
          <AboutTeam />
        </Reveal>
        <Reveal>
          <AboutOffices />
        </Reveal>
        <Reveal>
          <AboutCta />
        </Reveal>
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
