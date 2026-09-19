"use client";

import { useState } from "react";
import { Modal, useApiAction, useToast } from "@/components/admin/shared";
import { ActionButton, describeContentError, slugify, validateSlug } from "@/components/admin/content";
import { Field, Input } from "@/components/admin/ui";
import {
  POST_CATEGORY_LIMITS,
  postCategoriesApi,
  type AdminPostCategory,
} from "@/lib/api/admin/postCategories";

export interface CategoryQuickCreateProps {
  onClose: () => void;
  onCreated: (category: AdminPostCategory) => void;
}

/** Small dialog that creates a post category without leaving the editor. */
export function CategoryQuickCreate({ onClose, onCreated }: CategoryQuickCreateProps) {
  const toast = useToast();
  const action = useApiAction({ showErrorToast: false });
  const [nameVi, setNameVi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const slugError = validateSlug(slug, POST_CATEGORY_LIMITS.slug);

  const submit = async () => {
    if (!nameVi.trim() || !nameEn.trim()) {
      setError("Vui lòng nhập tên danh mục cho cả hai ngôn ngữ.");
      return;
    }
    if (slugError) {
      setError(slugError);
      return;
    }
    setError(null);
    const created = await action.run(
      () =>
        postCategoriesApi.create({
          slug: slug.trim() || undefined,
          translations: {
            vi: { name: nameVi.trim() },
            en: { name: nameEn.trim() },
          },
        }),
      {
        onError: (caught) => setError(describeContentError(caught)),
      },
    );
    if (created) {
      toast.success("Đã tạo danh mục.");
      onCreated(created);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Tạo danh mục bài viết"
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose} disabled={action.pending}>
            Huỷ
          </ActionButton>
          <ActionButton variant="primary" onClick={() => void submit()} pending={action.pending}>
            Tạo danh mục
          </ActionButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Tên danh mục (VI)" htmlFor="quick-category-vi" required>
          <Input
            id="quick-category-vi"
            value={nameVi}
            maxLength={POST_CATEGORY_LIMITS.name}
            onChange={(event) => {
              setNameVi(event.target.value);
              setSlug(slugify(event.target.value, POST_CATEGORY_LIMITS.slug));
            }}
          />
        </Field>
        <Field label="Tên danh mục (EN)" htmlFor="quick-category-en" required>
          <Input
            id="quick-category-en"
            value={nameEn}
            maxLength={POST_CATEGORY_LIMITS.name}
            onChange={(event) => setNameEn(event.target.value)}
          />
        </Field>
        <Field label="Đường dẫn" htmlFor="quick-category-slug" hint={slugError ?? undefined}>
          <Input
            id="quick-category-slug"
            value={slug}
            maxLength={POST_CATEGORY_LIMITS.slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
