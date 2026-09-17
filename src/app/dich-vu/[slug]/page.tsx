import { notFound } from "next/navigation";
import { serviceCategoryDetails, getServiceCategoryBySlug } from "@/content/serviceCategoryDetails";
import { SiteFooter } from "@/sections/SiteFooter";
import { ServiceCategoryPage } from "@/sections/ServiceCategoryPage";
import { PageTransition } from "@/components/PageTransition";

export function generateStaticParams() {
  return serviceCategoryDetails.map((category) => ({ slug: category.slug }));
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getServiceCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  return (
    <PageTransition>
      <main>
        <ServiceCategoryPage category={category} />
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
