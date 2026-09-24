"use client";

import { useTranslation } from "react-i18next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Pill } from "@/components/ui/Pill";

export function ProductTechStack({ techStack }: { techStack: string[] }) {
  const { t } = useTranslation();

  if (techStack.length === 0) return null;

  return (
    <div>
      <SectionHeading className="mb-4">{t("productDetailPage.sections.techStack")}</SectionHeading>
      <div className="flex flex-wrap gap-2">
        {techStack.map((tech) => (
          <Pill key={tech} label={tech} />
        ))}
      </div>
    </div>
  );
}
