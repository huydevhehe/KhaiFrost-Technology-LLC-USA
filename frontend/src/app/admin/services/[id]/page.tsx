"use client";

import { use } from "react";
import { ErrorState, TableSkeleton, useApiResource } from "@/components/admin/shared";
import type { ServiceCategoryDetail } from "@/lib/api/admin/serviceCatalog";
import { ServiceEditor } from "../ServiceEditor";

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const resource = useApiResource<ServiceCategoryDetail>(
    `/admin/services/${encodeURIComponent(id)}`,
  );

  if (resource.loading && !resource.data) return <TableSkeleton rows={8} columns={2} />;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.refetch} />;
  if (!resource.data) return <ErrorState message="Không tìm thấy dịch vụ." />;

  return (
    <ServiceEditor
      key={`${resource.data.id}:${resource.data.version}`}
      initial={resource.data}
      onReload={resource.refetch}
      reloading={resource.loading}
    />
  );
}
