"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, LayoutList, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  ImageThumb,
  PublicationBadge,
  TableSkeleton,
  formatDateTime,
  useApiAction,
  useApiList,
  useConfirm,
  useFilters,
  useToast,
} from "@/components/admin/shared";
import {
  ActionButton,
  Pager,
  RowIconButton,
  describeContentError,
} from "@/components/admin/content";
import { Input, Panel, Select } from "@/components/admin/ui";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  SERVICE_ICON_LABELS,
  serviceCatalogApi,
  type ServiceCategoryListItem,
  type ServiceIconKey,
} from "@/lib/api/admin/serviceCatalog";

const STATUS_OPTIONS = [
  { value: "", label: "Mọi trạng thái" },
  { value: "draft", label: "Bản nháp" },
  { value: "in_review", label: "Chờ duyệt" },
  { value: "published", label: "Đã xuất bản" },
  { value: "archived", label: "Lưu trữ" },
];

export default function AdminServicesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });

  const [status, setStatus] = useState("");
  const filters = useFilters({
    status: status || undefined,
    sortBy: "sortOrder",
    sortOrder: "ASC",
  });
  const list = useApiList<ServiceCategoryListItem>("/admin/services", {
    filters,
    pageSize: 50,
  });

  const canCreate = hasPermission(PERMISSIONS.SERVICE_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.SERVICE_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.SERVICE_DELETE);
  const canReorder =
    canUpdate && !status && list.search.trim() === "" && list.meta.totalPages <= 1;

  const remove = async (service: ServiceCategoryListItem) => {
    const title = service.titles.vi || service.titles.en || service.slug;
    const ok = await confirm({
      title: "Xoá dịch vụ?",
      message: `“${title}” sẽ bị xoá khỏi trang công khai.`,
      confirmLabel: "Xoá dịch vụ",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => serviceCatalogApi.remove(service.id), {
      onError: (error) => toast.error(describeContentError(error)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá dịch vụ.");
      list.refetch();
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= list.items.length) return;
    const ids = list.items.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const done = await action.run(() => serviceCatalogApi.reorder(ids), {
      onError: (error) => toast.error(describeContentError(error)),
    });
    if (done !== undefined) list.refetch();
  };

  const createButton = (
    <Link href="/admin/services/new">
      <ActionButton variant="primary" icon={<Plus size={16} />}>
        Tạo dịch vụ
      </ActionButton>
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý dịch vụ</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/services/overview">
            <ActionButton variant="secondary" icon={<LayoutList size={16} />}>
              Trang tổng quan dịch vụ
            </ActionButton>
          </Link>
          {canCreate && createButton}
        </div>
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-55 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <Input
              placeholder="Tìm theo tên dịch vụ hoặc đường dẫn…"
              aria-label="Tìm dịch vụ"
              className="pl-9"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <Select
            aria-label="Lọc theo trạng thái"
            className="w-44"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {list.loading && list.items.length === 0 ? (
          <TableSkeleton rows={5} columns={4} />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="Chưa có dịch vụ nào"
            description="Tạo dịch vụ đầu tiên hoặc đổi lại bộ lọc phía trên."
            icon={<Wrench size={28} />}
            action={canCreate ? createButton : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách dịch vụ</caption>
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Dịch vụ
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Cập nhật
                  </th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((service, index) => {
                  const missing = (["vi", "en"] as const).filter((code) => !service.titles[code]);
                  return (
                    <tr key={service.id} className="text-slate-700">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <ImageThumb
                            src={service.coverImageUrl}
                            alt=""
                            width={64}
                            height={48}
                            rounded="md"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/admin/services/${service.id}`}
                              className="font-medium text-slate-900 hover:text-accent"
                            >
                              {service.titles.vi || service.titles.en || "(Chưa có tên)"}
                            </Link>
                            <p className="truncate text-xs text-slate-400">
                              {SERVICE_ICON_LABELS[service.iconKey as ServiceIconKey] ??
                                service.iconKey}{" "}
                              · /{service.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PublicationBadge status={service.status} publishedAt={service.publishedAt} />
                          {missing.length > 0 && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Thiếu {missing.map((code) => code.toUpperCase()).join(", ")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {formatDateTime(service.updatedAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {canReorder && (
                            <>
                              <RowIconButton
                                title="Chuyển lên"
                                disabled={index === 0 || action.pending}
                                onClick={() => void move(index, -1)}
                              >
                                <ArrowUp size={15} />
                              </RowIconButton>
                              <RowIconButton
                                title="Chuyển xuống"
                                disabled={index === list.items.length - 1 || action.pending}
                                onClick={() => void move(index, 1)}
                              >
                                <ArrowDown size={15} />
                              </RowIconButton>
                            </>
                          )}
                          <Link href={`/admin/services/${service.id}`}>
                            <RowIconButton title="Chỉnh sửa">
                              <Pencil size={15} />
                            </RowIconButton>
                          </Link>
                          {canDelete && (
                            <RowIconButton
                              title="Xoá dịch vụ"
                              tone="danger"
                              disabled={action.pending}
                              onClick={() => void remove(service)}
                            >
                              <Trash2 size={15} />
                            </RowIconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {list.items.length > 0 && (
          <Pager meta={list.meta} onChange={list.setPage} noun="dịch vụ" disabled={list.loading} />
        )}
      </Panel>
    </div>
  );
}
