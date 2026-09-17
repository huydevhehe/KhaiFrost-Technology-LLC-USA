"use client";

import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconCircle } from "@/components/ui/IconCircle";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { ServiceCategoryWhyUsItem } from "@/types";

function WhyUsCard({ item }: { item: ServiceCategoryWhyUsItem }) {
  const title = useLocalizedField(item.title);
  const description = useLocalizedField(item.description);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <IconCircle icon={item.icon} />
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function CategoryWhyUs({
  eyebrow,
  heading,
  items,
}: {
  eyebrow: string;
  heading: string;
  items: ServiceCategoryWhyUsItem[];
}) {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8">
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <SectionHeading>{heading}</SectionHeading>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {items.map((item, index) => (
            <WhyUsCard key={index} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
