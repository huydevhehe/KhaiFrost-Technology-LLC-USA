"use client";

import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconCircle } from "@/components/ui/IconCircle";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { ServiceCategoryProcessStep } from "@/types";

function ProcessStepCard({ step }: { step: ServiceCategoryProcessStep }) {
  const title = useLocalizedField(step.title);
  const description = useLocalizedField(step.description);

  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="relative mb-4">
        <IconCircle icon={step.icon} />
        <span className="absolute -left-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full border border-accent bg-white text-[10px] font-bold text-accent">
          {step.step}
        </span>
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function CategoryProcess({
  eyebrow,
  heading,
  steps,
}: {
  eyebrow: string;
  heading: string;
  steps: ServiceCategoryProcessStep[];
}) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12">
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <SectionHeading>{heading}</SectionHeading>
        </div>
        <div className="relative grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-5 hidden border-t border-dashed border-slate-200 md:block" />
          {steps.map((step) => (
            <ProcessStepCard key={step.step} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
