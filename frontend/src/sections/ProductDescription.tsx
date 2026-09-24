"use client";

import { useTranslation } from "react-i18next";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function ProductDescription({ descriptionHtml }: { descriptionHtml: string | null }) {
  const { t } = useTranslation();

  if (!descriptionHtml) return null;

  return (
    <div>
      <SectionHeading className="mb-4">{t("productDetailPage.sections.description")}</SectionHeading>
      <div
        className="
          max-w-none text-slate-700
          [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900
          [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900
          [&_p]:mb-4 [&_p]:leading-relaxed
          [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2
          [&_strong]:font-semibold [&_strong]:text-slate-900
          [&_ul]:mb-5 [&_ul]:mt-2 [&_ul]:space-y-2 [&_ul]:list-none [&_ul]:pl-0
          [&_ul_li]:relative [&_ul_li]:pl-7 [&_ul_li]:leading-relaxed
          [&_ul_li:before]:content-['✓'] [&_ul_li:before]:absolute [&_ul_li:before]:left-0
          [&_ul_li:before]:top-0 [&_ul_li:before]:font-bold [&_ul_li:before]:text-accent
          [&_ol]:mb-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5
          [&_img]:my-6 [&_img]:w-full [&_img]:rounded-2xl [&_img]:object-cover
          [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0
        "
        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
      />
    </div>
  );
}
