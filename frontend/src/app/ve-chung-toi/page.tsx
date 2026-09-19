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
import { PageTransition } from "@/components/PageTransition";
import { Reveal } from "@/components/ui/Reveal";

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <PageTransition>
      <main>
        <AboutHero />
        <CategoryBreadcrumb currentLabel={t("aboutPage.breadcrumb.current")} />
        <Reveal>
          <AboutStory />
        </Reveal>
        <Reveal>
          <CategoryStats stats={aboutStats} />
        </Reveal>
        <Reveal>
          <AboutVisionMission />
        </Reveal>
        <Reveal>
          <CategoryWhyUs
            eyebrow={t("aboutPage.values.eyebrow")}
            heading={t("aboutPage.values.heading")}
            items={aboutValues}
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
