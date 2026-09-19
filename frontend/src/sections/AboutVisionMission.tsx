"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { aboutMission, aboutVision } from "@/content/aboutPageData";
import { htmlParagraphs, sectionImageUrl, useSection } from "@/lib/content/pages";
import { text } from "@/lib/content/store";
import { LocalizedText } from "@/types";

function VisionMissionCard({
  image,
  imageAlt,
  title,
  description,
}: {
  image: string;
  imageAlt: string;
  title: string;
  description: LocalizedText;
}) {
  const descriptionText = useLocalizedField(description);

  return (
    <div className="group relative h-80 w-full overflow-hidden rounded-2xl border border-slate-100 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-accent/20 hover:shadow-[0_25px_50px_-15px_rgba(14,165,233,0.35)]">
      <Image
        src={image}
        alt={imageAlt}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 translate-y-1 bg-white/30 px-5 py-2 backdrop-blur-none transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:bg-white/70 group-hover:py-5 group-hover:backdrop-blur-md">
        <span className="mb-0 block h-0.5 w-0 rounded-full bg-accent transition-all duration-500 ease-out group-hover:mb-2 group-hover:w-10" />
        <h3 className="text-lg font-bold text-slate-900 [text-shadow:0_1px_4px_rgba(255,255,255,0.9)]">
          {title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-800 [text-shadow:0_1px_4px_rgba(255,255,255,0.9)]">
          {descriptionText}
        </p>
      </div>
    </div>
  );
}

export function AboutVisionMission() {
  const { t } = useTranslation();
  const vision = useSection("/ve-chung-toi", "vision");
  const mission = useSection("/ve-chung-toi", "mission");
  const visionText = htmlParagraphs(vision.body).join(" ");
  const missionText = htmlParagraphs(mission.body).join(" ");

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <VisionMissionCard
            image={sectionImageUrl(vision, "image") ?? aboutVision.image}
            imageAlt={t("aboutPage.visionMission.visionImageAlt")}
            title={text(vision.heading, t("aboutPage.visionMission.visionTitle"))}
            description={visionText ? { en: visionText, vi: visionText } : aboutVision.description}
          />
          <VisionMissionCard
            image={sectionImageUrl(mission, "image") ?? aboutMission.image}
            imageAlt={t("aboutPage.visionMission.missionImageAlt")}
            title={text(mission.heading, t("aboutPage.visionMission.missionTitle"))}
            description={missionText ? { en: missionText, vi: missionText } : aboutMission.description}
          />
        </div>
      </div>
    </section>
  );
}
