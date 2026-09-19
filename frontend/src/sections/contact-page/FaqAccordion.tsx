"use client";

import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { htmlParagraphs, useSection } from "@/lib/content/pages";
import { asArray, text } from "@/lib/content/store";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";

const faqIndexes = [1, 2, 3, 4];

interface FaqItemDto {
  id?: string;
  question?: string;
  answer?: string;
}

export function FaqAccordion() {
  const { t } = useTranslation();
  const section = useSection("/lien-he", "faq");
  const apiItems = asArray<FaqItemDto>(section.items);
  const list =
    apiItems.length > 0
      ? apiItems.map((item, index) => ({
          key: text(item.id, `faq-${index}`),
          question: text(item.question, t(`contactPage.faq.q${index + 1}`)),
          answer: htmlParagraphs(item.answer).join(" ") || t(`contactPage.faq.a${index + 1}`),
        }))
      : faqIndexes.map((i) => ({
          key: String(i),
          question: t(`contactPage.faq.q${i}`),
          answer: t(`contactPage.faq.a${i}`),
        }));

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10">
          <SectionEyebrow>{text(section.eyebrow, t("contactPage.faq.eyebrow"))}</SectionEyebrow>
          <SectionHeading>{text(section.heading, t("contactPage.faq.heading"))}</SectionHeading>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((item) => (
            <details
              key={item.key}
              className="group rounded-lg border border-slate-200 px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-900">
                {item.question}
                <Plus
                  size={16}
                  className="flex-shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-45"
                />
              </summary>
              <p className="mt-3 text-sm text-slate-500">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
