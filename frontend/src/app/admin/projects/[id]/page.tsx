"use client";

import { use } from "react";
import { ErrorState, TableSkeleton, useApiResource } from "@/components/admin/shared";
import type { ProjectDetail } from "@/lib/api/admin/projects";
import { ProjectEditor } from "../ProjectEditor";
import { useProjectCategories } from "../useCategories";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const categories = useProjectCategories();
  const resource = useApiResource<ProjectDetail>(`/admin/projects/${encodeURIComponent(id)}`);

  if (resource.loading && !resource.data) return <TableSkeleton rows={8} columns={2} />;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.refetch} />;
  if (!resource.data) return <ErrorState message="Không tìm thấy dự án." />;

  return (
    <ProjectEditor
      key={`${resource.data.id}:${resource.data.version}`}
      initial={resource.data}
      categories={categories.categories}
      onReload={resource.refetch}
      reloading={resource.loading}
    />
  );
}
