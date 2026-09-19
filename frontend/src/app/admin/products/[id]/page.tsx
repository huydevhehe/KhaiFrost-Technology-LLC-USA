"use client";

import { use } from "react";
import { ErrorState, TableSkeleton, useApiResource } from "@/components/admin/shared";
import type { AdminProductDetail } from "@/lib/api/admin/products";
import { ProductEditor } from "../ProductEditor";
import { useProductCategories } from "../useCategories";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const categories = useProductCategories();
  const resource = useApiResource<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}`);

  if (resource.loading && !resource.data) return <TableSkeleton rows={8} columns={2} />;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.refetch} />;
  if (!resource.data) return <ErrorState message="Không tìm thấy sản phẩm." />;

  return (
    <ProductEditor
      key={`${resource.data.id}:${resource.data.version}`}
      initial={resource.data}
      categories={categories.categories}
      onReload={resource.refetch}
      reloading={resource.loading}
    />
  );
}
