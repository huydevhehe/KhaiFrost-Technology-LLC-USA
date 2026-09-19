"use client";

import { TableSkeleton } from "@/components/admin/shared";
import { InfoNotice } from "@/components/admin/content";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { ServiceEditor } from "../ServiceEditor";

export default function NewServicePage() {
  const { hasPermission, loading } = useAuth();

  if (loading) return <TableSkeleton rows={6} columns={2} />;
  if (!hasPermission(PERMISSIONS.SERVICE_CREATE)) {
    return <InfoNotice>Bạn không có quyền tạo dịch vụ mới.</InfoNotice>;
  }
  return <ServiceEditor initial={null} />;
}
