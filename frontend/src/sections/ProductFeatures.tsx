"use client";

import { useTranslation } from "react-i18next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconCircle } from "@/components/ui/IconCircle";

export function ProductFeatures({ features }: { features: string[] }) {
  const { t } = useTranslation();

  if (features.length === 0) return null;

  return (
    <div>
      <SectionHeading className="mb-4">{t("productDetailPage.sections.features")}</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((feature, index) => (
          <div
            key={`${feature}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
          >
            <IconCircle icon="check" />
            <span className="text-sm text-slate-700">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
