"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useSectionText } from "@/lib/content/pages";

export function WhyChooseUs() {
  const { t } = useTranslation();
  const section = useSectionText("/", "why-choose-us");

  return (
    <section className="relative overflow-hidden py-20">
      <Image
        src="/images/about/office-1.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority={false}
      />
      <div className="absolute inset-0 bg-slate-900/80" />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <SectionEyebrow>{section("eyebrow", t("whyChooseUs.eyebrow"))}</SectionEyebrow>
        <SectionHeading className="text-3xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-4xl lg:text-5xl">
          {section("heading", t("whyChooseUs.heading"))}
        </SectionHeading>
        <p className="mx-auto mt-6 max-w-3xl text-xl leading-relaxed text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)] sm:text-2xl">
          {section("intro", t("whyChooseUs.paragraph"))}
        </p>
      </div>
    </section>
  );
}
