"use client";

import { IconCircle } from "@/components/ui/IconCircle";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { ServiceCategoryStat } from "@/types";

function StatCard({ stat }: { stat: ServiceCategoryStat }) {
  const label = useLocalizedField(stat.label);
  const description = useLocalizedField(stat.description);

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
      <IconCircle icon={stat.icon} />
      <p className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl">
        {stat.value}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export function CategoryStats({ stats }: { stats: ServiceCategoryStat[] }) {
  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={`${stat.value}-${index}`} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
