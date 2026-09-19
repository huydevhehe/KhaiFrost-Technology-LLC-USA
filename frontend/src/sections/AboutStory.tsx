"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { aboutStoryParagraphs } from "@/content/aboutPageData";
import { headlineLines, htmlParagraphs, sectionImageUrl, useSection } from "@/lib/content/pages";
import { text } from "@/lib/content/store";

export function AboutStory() {
  const { t } = useTranslation();
  const paragraph1 = useLocalizedField(aboutStoryParagraphs[0]);
  const paragraph2 = useLocalizedField(aboutStoryParagraphs[1]);
  const story = useSection("/ve-chung-toi", "story");
  const apiParagraphs = htmlParagraphs(story.body);
  const paragraphs = apiParagraphs.length > 0 ? apiParagraphs : [paragraph1, paragraph2];
  const image = sectionImageUrl(story, "image") ?? "/images/about/office-1.jpg";
  const headline = headlineLines(
    text(story.heading, `${t("aboutPage.story.headlineLine1")} ${t("aboutPage.story.headlineLine2")}`),
    t("aboutPage.story.headlineLine1"),
    t("aboutPage.story.headlineLine2"),
  );

  return (
    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-2 md:items-center md:gap-16">
        <div>
          <SectionEyebrow>{text(story.eyebrow, t("aboutPage.story.eyebrow"))}</SectionEyebrow>
          <SectionHeading>
            {headline.line1}
            {headline.line2 !== null && (
              <>
                <br />
                {headline.line2}
              </>
            )}
          </SectionHeading>
          {paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className={`${index === 0 ? "mt-5" : "mt-4"} text-sm leading-relaxed text-slate-500`}
            >
              {paragraph}
            </p>
          ))}
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
          <Image
            src={image}
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
