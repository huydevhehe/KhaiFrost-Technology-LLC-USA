import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconCircle } from "@/components/ui/IconCircle";
import { whyUsItems } from "@/content/whyUsItems";

export function WhyChooseUs() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionEyebrow>Why KhaiFrost</SectionEyebrow>
            <SectionHeading>Why Choose KhaiFrost?</SectionHeading>
          </div>
          <p className="max-w-sm text-sm text-slate-500">
            We combine cutting-edge technology with real-world experience to
            deliver solutions that make a difference.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {whyUsItems.map((item) => (
            <div key={item.id} className="rounded-xl bg-white p-5 shadow-sm">
              <IconCircle icon={item.icon} />
              <h3 className="mt-4 font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
