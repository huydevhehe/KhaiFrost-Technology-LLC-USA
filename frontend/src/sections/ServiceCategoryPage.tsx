"use client";

import { notFound } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { useServiceDetail } from "@/lib/content/serviceDetail";
import type { ServiceCategoryDetail } from "@/types";
import { CategoryBreadcrumb } from "@/sections/CategoryBreadcrumb";
import { CategoryHero } from "@/sections/CategoryHero";
import { CategoryStats } from "@/sections/CategoryStats";
import { CategoryProducts } from "@/sections/CategoryProducts";
import { CategoryProcess } from "@/sections/CategoryProcess";
import { CategoryWhyUs } from "@/sections/CategoryWhyUs";
import { CategoryCaseStudies } from "@/sections/CategoryCaseStudies";
import { CategoryTestimonials } from "@/sections/CategoryTestimonials";
import { CategoryPartnerBanner } from "@/sections/CategoryPartnerBanner";
import { CategoryFaq } from "@/sections/CategoryFaq";
import { Reveal } from "@/components/ui/Reveal";

export function ServiceCategoryPage({ slug }: { slug: string }) {
  const { category, notFound: missing } = useServiceDetail(slug);

  if (missing) notFound();
  if (!category) return <div className="min-h-screen bg-navy" />;

  return <ServiceCategoryContent category={category} />;
}

function ServiceCategoryContent({ category }: { category: ServiceCategoryDetail }) {
  const { t } = useTranslation();
  const categoryName = useLocalizedField(category.categoryName);

  return (
    <>
      <CategoryHero
        title={category.heroTitle}
        subtitle={category.heroSubtitle}
        image={category.heroImage}
      />
      <CategoryBreadcrumb categoryName={category.categoryName} />
      {category.stats.length > 0 && (
        <Reveal>
          <CategoryStats stats={category.stats} />
        </Reveal>
      )}
      {category.products.length > 0 && (
        <Reveal>
          <CategoryProducts
            eyebrow={category.productsEyebrow}
            heading={category.productsHeading}
            intro={category.productsIntro}
            products={category.products}
          />
        </Reveal>
      )}
      {category.process.length > 0 && (
        <Reveal>
          <CategoryProcess
            eyebrow={t("serviceCategoryPage.process.eyebrow")}
            heading={t("serviceCategoryPage.process.heading")}
            steps={category.process}
          />
        </Reveal>
      )}
      {category.whyUs.length > 0 && (
        <Reveal>
          <CategoryWhyUs
            eyebrow={t("serviceCategoryPage.whyUs.eyebrow")}
            heading={t("serviceCategoryPage.whyUs.heading", { category: categoryName })}
            items={category.whyUs}
          />
        </Reveal>
      )}
      {category.caseStudies.length > 0 && (
        <Reveal>
          <CategoryCaseStudies
            eyebrow={t("serviceCategoryPage.caseStudies.eyebrow")}
            heading={t("serviceCategoryPage.caseStudies.heading", { category: categoryName })}
            caseStudies={category.caseStudies}
          />
        </Reveal>
      )}
      {category.testimonials.length > 0 && (
        <Reveal>
          <CategoryTestimonials
            eyebrow={t("serviceCategoryPage.testimonials.eyebrow")}
            heading={t("serviceCategoryPage.testimonials.heading")}
            testimonials={category.testimonials}
          />
        </Reveal>
      )}
      {category.partnerBanner && (
        <Reveal>
          <CategoryPartnerBanner banner={category.partnerBanner} />
        </Reveal>
      )}
      {category.faq.length > 0 && (
        <Reveal>
          <CategoryFaq
            eyebrow={t("serviceCategoryPage.faq.eyebrow")}
            heading={t("serviceCategoryPage.faq.heading", { category: categoryName })}
            faq={category.faq}
          />
        </Reveal>
      )}
    </>
  );
}
