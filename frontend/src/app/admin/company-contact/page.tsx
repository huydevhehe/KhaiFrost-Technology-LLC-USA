"use client";

import { InfoNotice } from "@/components/admin/content";
import { TableSkeleton } from "@/components/admin/shared";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { ContactGroup, SocialGroup } from "../settings/GroupForms";

export default function AdminCompanyContactPage() {
  const { hasPermission, loading } = useAuth();

  if (loading) return <TableSkeleton rows={5} columns={2} />;
  if (!hasPermission(PERMISSIONS.SETTING_READ)) {
    return <InfoNotice>Bạn không có quyền xem thông tin này.</InfoNotice>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Văn phòng & Mạng xã hội</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kênh liên hệ, giờ làm việc, văn phòng và mạng xã hội — dữ liệu dùng chung cho trang Liên
          hệ, trang Về chúng tôi và chân trang.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <ContactGroup />
        <SocialGroup />
      </div>
    </div>
  );
}
