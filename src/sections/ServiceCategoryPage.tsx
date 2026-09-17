"use client";

import { useTranslation } from "react-i18next";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { ServiceCategoryDetail } from "@/types";
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

export function ServiceCategoryPage({
  category,
}: {
  category: ServiceCategoryDetail;
}) {
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
      <CategoryStats stats={category.stats} />
      <CategoryProducts
        eyebrow={category.productsEyebrow}
        heading={category.productsHeading}
        intro={category.productsIntro}
        products={category.products}
      />
      <CategoryProcess
        eyebrow={t("serviceCategoryPage.process.eyebrow")}
        heading={t("serviceCategoryPage.process.heading")}
        steps={category.process}
      />
      <CategoryWhyUs
        eyebrow={t("serviceCategoryPage.whyUs.eyebrow")}
        heading={t("serviceCategoryPage.whyUs.heading", { category: categoryName })}
        items={category.whyUs}
      />
      <CategoryCaseStudies
        eyebrow={t("serviceCategoryPage.caseStudies.eyebrow")}
        heading={t("serviceCategoryPage.caseStudies.heading", { category: categoryName })}
        caseStudies={category.caseStudies}
      />
      <CategoryTestimonials
        eyebrow={t("serviceCategoryPage.testimonials.eyebrow")}
        heading={t("serviceCategoryPage.testimonials.heading")}
        testimonials={category.testimonials}
      />
      {category.partnerBanner && (
        <CategoryPartnerBanner banner={category.partnerBanner} />
      )}
      <CategoryFaq
        eyebrow={t("serviceCategoryPage.faq.eyebrow")}
        heading={t("serviceCategoryPage.faq.heading", { category: categoryName })}
        faq={category.faq}
      />
    </>
  );
}
