"use client";

import { useMemo } from "react";
import { useApiList, useApiResource } from "@/components/admin/shared";
import { Field, Input, Select } from "@/components/admin/ui";
import type { ServiceProductLinkType } from "@/lib/api/admin/serviceCatalog";

interface AdminProductOption {
  id: string;
  slug: string;
  names: Record<string, string | null>;
}

interface AdminPostOption {
  id: string;
  slug: string;
  titles: { vi: string; en: string };
}

const LINK_TYPE_LABELS: Record<ServiceProductLinkType, string> = {
  none: "Không gắn liên kết",
  product: "Sản phẩm",
  post: "Bài viết",
  external: "URL ngoài",
};

function ProductPicker({
  idPrefix,
  value,
  onChange,
  disabled,
}: {
  idPrefix: string;
  value: string | null;
  onChange: (id: string | null) => void;
  disabled: boolean;
}) {
  const list = useApiList<AdminProductOption>("/admin/products", { pageSize: 8 });
  const selected = useApiResource<AdminProductOption>(value ? `/admin/products/${value}` : null);
  const options = useMemo(() => {
    const byId = new Map<string, AdminProductOption>();
    for (const item of list.items) byId.set(item.id, item);
    if (selected.data) byId.set(selected.data.id, selected.data);
    return [...byId.values()];
  }, [list.items, selected.data]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        aria-label="Tìm sản phẩm"
        placeholder="Tìm sản phẩm theo tên..."
        value={list.search}
        disabled={disabled}
        onChange={(event) => list.setSearch(event.target.value)}
      />
      <Select
        id={`${idPrefix}-link-product`}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">— Chọn sản phẩm —</option>
        {options.map((product) => (
          <option key={product.id} value={product.id}>
            {product.names.vi || product.names.en || product.slug}
          </option>
        ))}
      </Select>
    </div>
  );
}

function PostPicker({
  idPrefix,
  value,
  onChange,
  disabled,
}: {
  idPrefix: string;
  value: string | null;
  onChange: (id: string | null) => void;
  disabled: boolean;
}) {
  const list = useApiList<AdminPostOption>("/admin/posts", { pageSize: 8 });
  const selected = useApiResource<AdminPostOption>(value ? `/admin/posts/${value}` : null);
  const options = useMemo(() => {
    const byId = new Map<string, AdminPostOption>();
    for (const item of list.items) byId.set(item.id, item);
    if (selected.data) byId.set(selected.data.id, selected.data);
    return [...byId.values()];
  }, [list.items, selected.data]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        aria-label="Tìm bài viết"
        placeholder="Tìm bài viết theo tiêu đề..."
        value={list.search}
        disabled={disabled}
        onChange={(event) => list.setSearch(event.target.value)}
      />
      <Select
        id={`${idPrefix}-link-post`}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">— Chọn bài viết —</option>
        {options.map((post) => (
          <option key={post.id} value={post.id}>
            {post.titles.vi || post.titles.en || post.slug}
          </option>
        ))}
      </Select>
    </div>
  );
}

export interface LinkTargetValue {
  linkType: ServiceProductLinkType;
  linkProductId: string | null;
  linkPostId: string | null;
  linkExternalUrl: string;
}

interface LinkTargetPickerProps extends LinkTargetValue {
  idPrefix: string;
  disabled: boolean;
  onChange: (patch: Partial<LinkTargetValue>) => void;
}

/** Where "Xem chi tiết" points to: a real product, a real post, an outside URL, or nothing. */
export function LinkTargetPicker({
  idPrefix,
  linkType,
  linkProductId,
  linkPostId,
  linkExternalUrl,
  disabled,
  onChange,
}: LinkTargetPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Xem chi tiết trỏ tới" htmlFor={`${idPrefix}-link-type`}>
        <Select
          id={`${idPrefix}-link-type`}
          value={linkType}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              linkType: event.target.value as ServiceProductLinkType,
              linkProductId: null,
              linkPostId: null,
              linkExternalUrl: "",
            })
          }
        >
          {(Object.keys(LINK_TYPE_LABELS) as ServiceProductLinkType[]).map((key) => (
            <option key={key} value={key}>
              {LINK_TYPE_LABELS[key]}
            </option>
          ))}
        </Select>
      </Field>
      {linkType === "product" && (
        <ProductPicker
          idPrefix={idPrefix}
          value={linkProductId}
          disabled={disabled}
          onChange={(linkProductId) => onChange({ linkProductId })}
        />
      )}
      {linkType === "post" && (
        <PostPicker
          idPrefix={idPrefix}
          value={linkPostId}
          disabled={disabled}
          onChange={(linkPostId) => onChange({ linkPostId })}
        />
      )}
      {linkType === "external" && (
        <Field
          label="URL ngoài"
          htmlFor={`${idPrefix}-link-external`}
          hint="Địa chỉ http(s) hoặc đường dẫn nội bộ như /lien-he."
        >
          <Input
            id={`${idPrefix}-link-external`}
            value={linkExternalUrl}
            maxLength={500}
            disabled={disabled}
            onChange={(event) => onChange({ linkExternalUrl: event.target.value })}
          />
        </Field>
      )}
    </div>
  );
}
