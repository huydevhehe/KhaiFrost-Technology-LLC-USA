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
import { Field, Input, Panel, Textarea } from "@/components/admin/ui";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  PRODUCT_CATEGORY_LIMITS,
  productCategoriesApi,
  type AdminProductCategory,
} from "@/lib/api/admin/productCategories";
import { useProductCategories } from "../useCategories";

interface FormState {
  slug: string;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  sortOrder: string;
  isActive: boolean;
}

function toForm(category: AdminProductCategory | null): FormState {
  return {
    slug: category?.slug ?? "",
    nameVi: category?.translations.vi?.name ?? "",
    nameEn: category?.translations.en?.name ?? "",
    descriptionVi: category?.translations.vi?.description ?? "",
    descriptionEn: category?.translations.en?.description ?? "",
    sortOrder: String(category?.sortOrder ?? 0),
    isActive: category?.isActive ?? true,
  };
}

export default function ProductCategoriesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });
  const { categories, loading, error, reload } = useProductCategories();

  const [editing, setEditing] = useState<AdminProductCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(() => toForm(null));
  const [formError, setFormError] = useState<string | null>(null);

  const canManage = hasPermission(PERMISSIONS.PRODUCT_CATEGORY_MANAGE);
  const open = creating || editing !== null;

  const startCreate = () => {
    setForm(toForm(null));
    setFormError(null);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (category: AdminProductCategory) => {
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
    const slugError = validateSlug(form.slug, PRODUCT_CATEGORY_LIMITS.slug);
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
      vi: { name: form.nameVi.trim(), description: form.descriptionVi.trim() || null },
      en: { name: form.nameEn.trim(), description: form.descriptionEn.trim() || null },
    };
    setFormError(null);
    const result = await action.run(
      () =>
        editing
          ? productCategoriesApi.update(editing.id, {
              version: editing.version,
              slug: form.slug.trim() || undefined,
              translations,
              sortOrder,
              isActive: form.isActive,
            })
          : productCategoriesApi.create({
              slug: form.slug.trim() || undefined,
              translations,
              sortOrder,
              isActive: form.isActive,
            }),
      { onError: (caught) => setFormError(describeContentError(caught)) },
    );
    if (result) {
      toast.success(editing ? "Đã cập nhật danh mục." : "Đã tạo danh mục.");
      close();
      reload();
    }
  };

  const remove = async (category: AdminProductCategory) => {
    const ok = await confirm({
      title: "Xoá danh mục?",
      message: "Chỉ xoá được danh mục không còn sản phẩm nào sử dụng.",
      confirmLabel: "Xoá danh mục",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => productCategoriesApi.remove(category.id), {
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
            href="/admin/products"
            aria-label="Quay lại danh sách sản phẩm"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Danh mục sản phẩm</h1>
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
            description="Danh mục giúp nhóm các sản phẩm theo loại."
            icon={<FolderCog size={28} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách danh mục sản phẩm</caption>
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
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Trạng thái
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
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          category.isActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {category.isActive ? "Đang dùng" : "Đã tắt"}
                      </span>
                    </td>
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
                          disabled={!canManage || action.pending}
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
              <Field label="Tên (VI)" htmlFor="prodcat-name-vi" required>
                <Input
                  id="prodcat-name-vi"
                  value={form.nameVi}
                  maxLength={PRODUCT_CATEGORY_LIMITS.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      nameVi: event.target.value,
                      slug:
                        editing === null
                          ? slugify(event.target.value, PRODUCT_CATEGORY_LIMITS.slug)
                          : current.slug,
                    }))
                  }
                />
              </Field>
              <Field label="Tên (EN)" htmlFor="prodcat-name-en" required>
                <Input
                  id="prodcat-name-en"
                  value={form.nameEn}
                  maxLength={PRODUCT_CATEGORY_LIMITS.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nameEn: event.target.value }))
                  }
                />
              </Field>
              <Field label="Mô tả (VI)" htmlFor="prodcat-desc-vi">
                <Textarea
                  id="prodcat-desc-vi"
                  rows={3}
                  value={form.descriptionVi}
                  maxLength={PRODUCT_CATEGORY_LIMITS.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, descriptionVi: event.target.value }))
                  }
                />
              </Field>
              <Field label="Mô tả (EN)" htmlFor="prodcat-desc-en">
                <Textarea
                  id="prodcat-desc-en"
                  rows={3}
                  value={form.descriptionEn}
                  maxLength={PRODUCT_CATEGORY_LIMITS.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, descriptionEn: event.target.value }))
                  }
                />
              </Field>
              <Field label="Đường dẫn" htmlFor="prodcat-slug">
                <Input
                  id="prodcat-slug"
                  value={form.slug}
                  maxLength={PRODUCT_CATEGORY_LIMITS.slug}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, slug: event.target.value }))
                  }
                />
              </Field>
              <Field label="Thứ tự hiển thị" htmlFor="prodcat-sort">
                <Input
                  id="prodcat-sort"
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
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
              />
              Đang sử dụng
            </label>
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
