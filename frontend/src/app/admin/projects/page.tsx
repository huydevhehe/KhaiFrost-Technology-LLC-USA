"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderCog, FolderKanban, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { projectsApi, type ProjectListItem } from "@/lib/api/admin/projects";
import { projectCategoryName, useProjectCategories } from "./useCategories";

const STATUS_OPTIONS = [
  { value: "", label: "Mọi trạng thái" },
  { value: "draft", label: "Bản nháp" },
  { value: "in_review", label: "Chờ duyệt" },
  { value: "published", label: "Đã xuất bản" },
  { value: "archived", label: "Lưu trữ" },
];

export default function AdminProjectsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });
  const { categories } = useProjectCategories();

  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [featured, setFeatured] = useState("");
  const [mine, setMine] = useState(false);

  const filters = useFilters({
    status: status || undefined,
    categoryId: categoryId || undefined,
    featured: featured === "" ? undefined : featured === "yes",
    mine: mine || undefined,
  });

  const list = useApiList<ProjectListItem>("/admin/projects", { filters, pageSize: 20 });
  const canCreate = hasPermission(PERMISSIONS.PROJECT_CREATE);
  const canDelete = hasPermission(PERMISSIONS.PROJECT_DELETE);

  const categoryLabel = (id: string | null) => {
    const found = id ? categories.find((category) => category.id === id) : undefined;
    return found ? projectCategoryName(found) : "Chưa có danh mục";
  };

  const remove = async (project: ProjectListItem) => {
    const title = project.titles.vi || project.titles.en || project.slug;
    const ok = await confirm({
      title: "Xoá dự án?",
      message: `“${title}” sẽ bị xoá khỏi trang công khai.`,
      confirmLabel: "Xoá dự án",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => projectsApi.remove(project.id), {
      onError: (error) => toast.error(describeContentError(error)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá dự án.");
      list.refetch();
    }
  };

  const createButton = (
    <Link href="/admin/projects/new">
      <ActionButton variant="primary" icon={<Plus size={16} />}>
        Tạo dự án
      </ActionButton>
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý dự án</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/projects/categories">
            <ActionButton variant="secondary" icon={<FolderCog size={16} />}>
              Danh mục
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
              placeholder="Tìm theo tên dự án hoặc đường dẫn…"
              aria-label="Tìm dự án"
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
          <Select
            aria-label="Lọc theo danh mục"
            className="w-48"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Mọi danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {projectCategoryName(category)}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Lọc theo nổi bật"
            className="w-40"
            value={featured}
            onChange={(event) => setFeatured(event.target.value)}
          >
            <option value="">Nổi bật: tất cả</option>
            <option value="yes">Chỉ dự án nổi bật</option>
            <option value="no">Không nổi bật</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={mine}
              onChange={(event) => setMine(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
            />
            Dự án của tôi
          </label>
        </div>

        {list.loading && list.items.length === 0 ? (
          <TableSkeleton rows={6} columns={4} />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="Chưa có dự án nào"
            description="Tạo dự án đầu tiên hoặc đổi lại bộ lọc phía trên."
            icon={<FolderKanban size={28} />}
            action={canCreate ? createButton : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách dự án</caption>
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Dự án
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
                {list.items.map((project) => {
                  const missing = (["vi", "en"] as const).filter((code) => !project.titles[code]);
                  return (
                    <tr key={project.id} className="text-slate-700">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <ImageThumb
                            src={project.thumbnailUrl}
                            alt=""
                            width={64}
                            height={48}
                            rounded="md"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/admin/projects/${project.id}`}
                              className="font-medium text-slate-900 hover:text-accent"
                            >
                              {project.titles.vi || project.titles.en || "(Chưa có tên)"}
                            </Link>
                            <p className="truncate text-xs text-slate-400">
                              {categoryLabel(project.categoryId)} · /{project.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PublicationBadge status={project.status} />
                          {missing.length > 0 && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Thiếu {missing.map((code) => code.toUpperCase()).join(", ")}
                            </span>
                          )}
                          {project.featured && (
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                              Nổi bật
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {formatDateTime(project.updatedAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/projects/${project.id}`}>
                            <RowIconButton title="Chỉnh sửa">
                              <Pencil size={15} />
                            </RowIconButton>
                          </Link>
                          {canDelete && (
                            <RowIconButton
                              title="Xoá dự án"
                              tone="danger"
                              disabled={action.pending}
                              onClick={() => void remove(project)}
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
          <Pager meta={list.meta} onChange={list.setPage} noun="dự án" disabled={list.loading} />
        )}
      </Panel>
    </div>
  );
}
