import { serviceCategoryDetails } from "@/content/serviceCategoryDetails";
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
  return (
    <PageTransition>
      <main>
        <ServiceCategoryPage slug={slug} />
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
