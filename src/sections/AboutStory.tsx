"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { aboutStoryParagraphs } from "@/content/aboutPageData";

export function AboutStory() {
  const { t } = useTranslation();
  const paragraph1 = useLocalizedField(aboutStoryParagraphs[0]);
  const paragraph2 = useLocalizedField(aboutStoryParagraphs[1]);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2 md:items-center md:gap-16">
        <div>
          <SectionEyebrow>{t("aboutPage.story.eyebrow")}</SectionEyebrow>
          <SectionHeading>
            {t("aboutPage.story.headlineLine1")}
            <br />
            {t("aboutPage.story.headlineLine2")}
          </SectionHeading>
          <p className="mt-5 text-sm leading-relaxed text-slate-500">
            {paragraph1}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            {paragraph2}
          </p>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/about/office-1.jpg"
            alt={t("aboutPage.story.imageAlt")}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
