"use client";

import { ErrorState, TableSkeleton } from "@/components/admin/shared";
import { InfoNotice } from "@/components/admin/content";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { ProjectEditor } from "../ProjectEditor";
import { useProjectCategories } from "../useCategories";

export default function NewProjectPage() {
  const { hasPermission, loading } = useAuth();
  const categories = useProjectCategories();

  if (loading || categories.loading) return <TableSkeleton rows={6} columns={2} />;
  if (!hasPermission(PERMISSIONS.PROJECT_CREATE)) {
    return <InfoNotice>Bạn không có quyền tạo dự án mới.</InfoNotice>;
  }
  if (categories.error) {
    return <ErrorState error={categories.error} onRetry={categories.reload} />;
  }

  return <ProjectEditor initial={null} categories={categories.categories} />;
}
