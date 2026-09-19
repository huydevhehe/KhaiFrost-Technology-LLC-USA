"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderCog, Pencil, Plus, Trash2 } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  Modal,
  TableSkeleton,
  useApiAction,
  useConfirm,
  useToast,
} from "@/components/admin/shared";
import {
  ActionButton,
  RowIconButton,
  describeContentError,
  slugify,
  validateSlug,
} from "@/components/admin/content";
import { Field, Input, Panel } from "@/components/admin/ui";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  PROJECT_CATEGORY_LIMITS,
  projectCategoriesApi,
  type ProjectCategory,
} from "@/lib/api/admin/projectCategories";
import { useProjectCategories } from "../useCategories";

interface FormState {
  slug: string;
  nameVi: string;
  nameEn: string;
  sortOrder: string;
}

function toForm(category: ProjectCategory | null): FormState {
  return {
    slug: category?.slug ?? "",
    nameVi: category?.translations.vi?.name ?? "",
    nameEn: category?.translations.en?.name ?? "",
    sortOrder: String(category?.sortOrder ?? 0),
  };
}

export default function ProjectCategoriesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });
  const { categories, loading, error, reload } = useProjectCategories();

  const [editing, setEditing] = useState<ProjectCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(() => toForm(null));
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = hasPermission(PERMISSIONS.PROJECT_UPDATE_ANY);
  const canDelete = hasPermission(PERMISSIONS.PROJECT_DELETE);
  const open = creating || editing !== null;

  const startCreate = () => {
    setForm(toForm(null));
    setFormError(null);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (category: ProjectCategory) => {
    setForm(toForm(category));
    setFormError(null);
    setCreating(false);
    setEditing(category);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setFormError(null);
  };

  const submit = async () => {
    if (!form.nameVi.trim() || !form.nameEn.trim()) {
      setFormError("Vui lòng nhập tên danh mục cho cả hai ngôn ngữ.");
      return;
    }
    const slugError = validateSlug(form.slug, PROJECT_CATEGORY_LIMITS.slug);
    if (slugError) {
      setFormError(slugError);
      return;
    }
    const sortOrder = Number(form.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setFormError("Thứ tự phải là số nguyên không âm.");
      return;
    }
    const translations = {
      vi: { name: form.nameVi.trim() },
      en: { name: form.nameEn.trim() },
    };
    setFormError(null);
    const result = await action.run(
      () =>
        editing
          ? projectCategoriesApi.update(editing.id, {
              version: editing.version,
              slug: form.slug.trim() || undefined,
              translations,
              sortOrder,
            })
          : projectCategoriesApi.create({
              slug: form.slug.trim() || undefined,
              translations,
              sortOrder,
            }),
      { onError: (caught) => setFormError(describeContentError(caught)) },
    );
    if (result) {
      toast.success(editing ? "Đã cập nhật danh mục." : "Đã tạo danh mục.");
      close();
      reload();
    }
  };

  const remove = async (category: ProjectCategory) => {
    const ok = await confirm({
      title: "Xoá danh mục?",
      message: "Chỉ xoá được danh mục không còn dự án nào sử dụng.",
      confirmLabel: "Xoá danh mục",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => projectCategoriesApi.remove(category.id), {
      onError: (caught) => toast.error(describeContentError(caught)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá danh mục.");
      reload();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/projects"
            aria-label="Quay lại danh sách dự án"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Danh mục dự án</h1>
        </div>
        {canManage && (
          <ActionButton variant="primary" icon={<Plus size={16} />} onClick={startCreate}>
            Thêm danh mục
          </ActionButton>
        )}
      </div>

      <Panel>
        {loading ? (
          <TableSkeleton rows={4} columns={4} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : categories.length === 0 ? (
          <EmptyState
            title="Chưa có danh mục nào"
            description="Danh mục giúp nhóm các dự án theo lĩnh vực."
            icon={<FolderCog size={28} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách danh mục dự án</caption>
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Tên (VI / EN)
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Đường dẫn
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Thứ tự
                  </th>
                  <th scope="col" className="py-3 pr-4 text-right font-medium">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category.id} className="text-slate-700">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900">
                        {category.translations.vi?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {category.translations.en?.name ?? "—"}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">/{category.slug}</td>
                    <td className="py-3 pr-4 text-slate-500">{category.sortOrder}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <RowIconButton
                          title="Chỉnh sửa danh mục"
                          disabled={!canManage}
                          onClick={() => startEdit(category)}
                        >
                          <Pencil size={15} />
                        </RowIconButton>
                        <RowIconButton
                          title="Xoá danh mục"
                          tone="danger"
                          disabled={!canDelete || action.pending}
                          onClick={() => void remove(category)}
                        >
                          <Trash2 size={15} />
                        </RowIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {open && (
        <Modal
          open
          onClose={close}
          title={editing ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
          footer={
            <>
              <ActionButton variant="secondary" onClick={close} disabled={action.pending}>
                Huỷ
              </ActionButton>
              <ActionButton
                variant="primary"
                onClick={() => void submit()}
                pending={action.pending}
              >
                Lưu
              </ActionButton>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Tên (VI)" htmlFor="pcat-name-vi" required>
                <Input
                  id="pcat-name-vi"
                  value={form.nameVi}
                  maxLength={PROJECT_CATEGORY_LIMITS.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      nameVi: event.target.value,
                      slug:
                        editing === null
                          ? slugify(event.target.value, PROJECT_CATEGORY_LIMITS.slug)
                          : current.slug,
                    }))
                  }
                />
              </Field>
              <Field label="Tên (EN)" htmlFor="pcat-name-en" required>
                <Input
                  id="pcat-name-en"
                  value={form.nameEn}
                  maxLength={PROJECT_CATEGORY_LIMITS.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nameEn: event.target.value }))
                  }
                />
              </Field>
              <Field label="Đường dẫn" htmlFor="pcat-slug">
                <Input
                  id="pcat-slug"
                  value={form.slug}
                  maxLength={PROJECT_CATEGORY_LIMITS.slug}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, slug: event.target.value }))
                  }
                />
              </Field>
              <Field label="Thứ tự hiển thị" htmlFor="pcat-sort">
                <Input
                  id="pcat-sort"
                  type="number"
                  min={0}
                  max={100000}
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                />
              </Field>
            </div>
            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
