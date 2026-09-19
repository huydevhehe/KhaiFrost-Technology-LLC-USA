"use client";

import { ErrorState, TableSkeleton } from "@/components/admin/shared";
import { InfoNotice } from "@/components/admin/content";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { ProductEditor } from "../ProductEditor";
import { useProductCategories } from "../useCategories";

export default function NewProductPage() {
  const { hasPermission, loading } = useAuth();
  const categories = useProductCategories();

  if (loading || categories.loading) return <TableSkeleton rows={6} columns={2} />;
  if (!hasPermission(PERMISSIONS.PRODUCT_CREATE)) {
    return <InfoNotice>Bạn không có quyền tạo sản phẩm mới.</InfoNotice>;
  }
  if (categories.error) {
    return <ErrorState error={categories.error} onRetry={categories.reload} />;
  }

  return <ProductEditor initial={null} categories={categories.categories} />;
}
