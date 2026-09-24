"use client";

import { notFound } from "next/navigation";
import { useProductDetail, type PublicProductDetail } from "@/lib/content/productDetail";
import { ProductBreadcrumb } from "@/sections/ProductBreadcrumb";
import { ProductGallery } from "@/sections/ProductGallery";
import { ProductDescription } from "@/sections/ProductDescription";
import { ProductFeatures } from "@/sections/ProductFeatures";
import { ProductTechStack } from "@/sections/ProductTechStack";
import { ProductSpecs } from "@/sections/ProductSpecs";
import { ProductSidebar } from "@/sections/ProductSidebar";
import { ProductRelated } from "@/sections/ProductRelated";
import { Reveal } from "@/components/ui/Reveal";

export function ProductDetailPage({ slug }: { slug: string }) {
  const { product, notFound: missing } = useProductDetail(slug);

  if (missing) notFound();
  if (!product) return <div className="min-h-screen bg-navy" />;

  return <ProductDetailContent product={product} />;
}

function ProductDetailContent({ product }: { product: PublicProductDetail }) {
  const galleryImages = product.galleryUrls.length > 0
    ? product.galleryUrls
    : product.coverImageUrl
      ? [product.coverImageUrl]
      : [];

  return (
    <>
      <ProductBreadcrumb
        categoryName={product.category?.name ?? null}
        categorySlug={product.category?.slug ?? null}
        productName={product.name}
      />

      <section className="bg-white py-10">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-10">
            <Reveal>
              <ProductGallery images={galleryImages} name={product.name} />
            </Reveal>

            <div className="lg:hidden">
              <ProductSidebar product={product} />
            </div>

            <Reveal>
              <ProductDescription descriptionHtml={product.descriptionHtml} />
            </Reveal>
            <Reveal>
              <ProductFeatures features={product.features} />
            </Reveal>
            <Reveal>
              <ProductTechStack techStack={product.techStack} />
            </Reveal>
            <Reveal>
              <ProductSpecs specifications={product.specifications} />
            </Reveal>
          </div>

          <div className="hidden lg:block">
            <div className="lg:sticky lg:top-24">
              <ProductSidebar product={product} />
            </div>
          </div>
        </div>
      </section>

      {product.related.length > 0 && (
        <Reveal>
          <ProductRelated related={product.related} />
        </Reveal>
      )}
    </>
  );
}
