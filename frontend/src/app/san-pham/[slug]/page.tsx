import { SiteFooter } from "@/sections/SiteFooter";
import { ProductDetailPage } from "@/sections/ProductDetailPage";
import { PageTransition } from "@/components/PageTransition";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PageTransition>
      <main>
        <ProductDetailPage slug={slug} />
      </main>
      <SiteFooter />
    </PageTransition>
  );
}
