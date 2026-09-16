"use client";

import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { testimonials } from "@/content/testimonials";
import { Testimonial } from "@/types";

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const quote = useLocalizedField(testimonial.quote);

  return (
    <div>
      <VideoThumbnail
        src={testimonial.thumbnail}
        alt={testimonial.name}
        aspect="square"
      />
      <p className="mt-3 text-sm font-medium text-slate-800">
        &ldquo;{quote}&rdquo;
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {testimonial.name} · {testimonial.role}
      </p>
    </div>
  );
}

export function TestimonialWall() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <SectionEyebrow>{t("testimonials.eyebrow")}</SectionEyebrow>
            <SectionHeading>{t("testimonials.heading")}</SectionHeading>
          </div>
          <a href="#" className="text-sm font-medium text-accent">
            {t("testimonials.viewMore")}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
