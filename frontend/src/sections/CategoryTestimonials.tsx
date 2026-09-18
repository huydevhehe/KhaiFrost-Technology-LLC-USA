"use client";

import Image from "next/image";
import { Quote } from "lucide-react";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { ServiceCategoryTestimonial } from "@/types";

function TestimonialCard({
  testimonial,
}: {
  testimonial: ServiceCategoryTestimonial;
}) {
  const quote = useLocalizedField(testimonial.quote);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <Quote size={28} className="text-accent/30" fill="currentColor" />
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{quote}</p>
      <div className="mt-5 flex items-center gap-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-full">
          <Image
            src={testimonial.avatar}
            alt={testimonial.name}
            fill
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {testimonial.name}
          </p>
          <p className="text-xs text-slate-400">{testimonial.role}</p>
        </div>
      </div>
    </div>
  );
}

export function CategoryTestimonials({
  eyebrow,
  heading,
  testimonials,
}: {
  eyebrow: string;
  heading: string;
  testimonials: ServiceCategoryTestimonial[];
}) {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <SectionHeading>{heading}</SectionHeading>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
