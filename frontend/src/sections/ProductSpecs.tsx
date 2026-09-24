"use client";

import { useTranslation } from "react-i18next";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function ProductSpecs({ specifications }: { specifications: Record<string, string | number> }) {
  const { t } = useTranslation();
  const entries = Object.entries(specifications);

  if (entries.length === 0) return null;

  return (
    <div>
      <SectionHeading className="mb-4">{t("productDetailPage.sections.specs")}</SectionHeading>
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {entries.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
