"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderCog, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  ImageThumb,
  MissingLocalesBadge,
  PublicationBadge,
  TableSkeleton,
  formatDateTime,
  useApiAction,
  useApiList,
  useConfirm,
  useFilters,
  useToast,
  type Locale,
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
  BILLING_PERIOD_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  productsApi,
  type AdminProductListItem,
} from "@/lib/api/admin/products";
import { productCategoryName, useProductCategories } from "./useCategories";

const STATUS_OPTIONS = [
  { value: "", label: "Mọi trạng thái" },
  { value: "draft", label: "Bản nháp" },
  { value: "in_review", label: "Chờ duyệt" },
  { value: "published", label: "Đã xuất bản" },
  { value: "archived", label: "Lưu trữ" },
];

function formatPrice(product: AdminProductListItem): string {
  if (product.priceOnRequest) return "Liên hệ báo giá";
  const price = product.prices.find((item) => item.isDefault) ?? product.prices[0];
  if (!price) return "Chưa có giá";
  const amount = Number(price.amount);
  const formatted = Number.isFinite(amount)
    ? new Intl.NumberFormat(price.currency === "VND" ? "vi-VN" : "en-US", {
        style: "currency",
        currency: price.currency,
        maximumFractionDigits: price.currency === "VND" ? 0 : 2,
      }).format(amount)
    : `${price.amount} ${price.currency}`;
  const extra = product.prices.length > 1 ? ` (+${product.prices.length - 1})` : "";
  return `${formatted} · ${BILLING_PERIOD_LABELS[price.billingPeriod]}${extra}`;
}

export default function AdminProductsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });
  const { categories } = useProductCategories();

  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [featured, setFeatured] = useState("");
  const [missingLocale, setMissingLocale] = useState("");

  const filters = useFilters({
    status: status || undefined,
    type: type || undefined,
    categoryId: categoryId || undefined,
    featured: featured === "" ? undefined : featured === "yes",
    missingLocale: missingLocale || undefined,
  });

  const list = useApiList<AdminProductListItem>("/admin/products", { filters, pageSize: 20 });
  const canCreate = hasPermission(PERMISSIONS.PRODUCT_CREATE);
  const canDelete = hasPermission(PERMISSIONS.PRODUCT_DELETE);

  const categoryLabel = (id: string | null) => {
    const found = id ? categories.find((category) => category.id === id) : undefined;
    return found ? productCategoryName(found) : "Chưa có danh mục";
  };

  const remove = async (product: AdminProductListItem) => {
    const name = product.names.vi || product.names.en || product.slug;
    const ok = await confirm({
      title: "Xoá sản phẩm?",
      message: `“${name}” sẽ bị xoá khỏi trang công khai.`,
      confirmLabel: "Xoá sản phẩm",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => productsApi.remove(product.id), {
      onError: (error) => toast.error(describeContentError(error)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá sản phẩm.");
      list.refetch();
    }
  };

  const createButton = (
    <Link href="/admin/products/new">
      <ActionButton variant="primary" icon={<Plus size={16} />}>
        Tạo sản phẩm
      </ActionButton>
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý sản phẩm</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/products/categories">
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
              placeholder="Tìm theo tên, mã SKU hoặc đường dẫn…"
              aria-label="Tìm sản phẩm"
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
            aria-label="Lọc theo loại sản phẩm"
            className="w-48"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">Mọi loại</option>
            {PRODUCT_TYPES.map((value) => (
              <option key={value} value={value}>
                {PRODUCT_TYPE_LABELS[value]}
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
                {productCategoryName(category)}
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
            <option value="yes">Chỉ sản phẩm nổi bật</option>
            <option value="no">Không nổi bật</option>
          </Select>
          <Select
            aria-label="Lọc theo bản dịch thiếu"
            className="w-48"
            value={missingLocale}
            onChange={(event) => setMissingLocale(event.target.value)}
          >
            <option value="">Mọi bản dịch</option>
            <option value="vi">Thiếu tiếng Việt</option>
            <option value="en">Thiếu tiếng Anh</option>
          </Select>
        </div>

        {list.loading && list.items.length === 0 ? (
          <TableSkeleton rows={6} columns={5} />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="Chưa có sản phẩm nào"
            description="Tạo sản phẩm đầu tiên hoặc đổi lại bộ lọc phía trên."
            icon={<Package size={28} />}
            action={canCreate ? createButton : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Danh sách sản phẩm</caption>
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Sản phẩm
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Loại
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Giá
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
                {list.items.map((product) => (
                  <tr key={product.id} className="text-slate-700">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <ImageThumb
                          src={product.coverImageUrl}
                          alt=""
                          width={64}
                          height={48}
                          rounded="md"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="font-medium text-slate-900 hover:text-accent"
                          >
                            {product.names.vi || product.names.en || "(Chưa có tên)"}
                          </Link>
                          <p className="truncate text-xs text-slate-400">
                            {categoryLabel(product.categoryId)}
                            {product.sku ? ` · ${product.sku}` : ""} · /{product.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{PRODUCT_TYPE_LABELS[product.type]}</td>
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-500">
                      {formatPrice(product)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PublicationBadge status={product.status} publishedAt={product.publishedAt} />
                        <MissingLocalesBadge locales={product.missingLocales as Locale[]} />
                        {product.isFeatured && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                            Nổi bật
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{formatDateTime(product.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/products/${product.id}`}>
                          <RowIconButton title="Chỉnh sửa">
                            <Pencil size={15} />
                          </RowIconButton>
                        </Link>
                        {canDelete && (
                          <RowIconButton
                            title="Xoá sản phẩm"
                            tone="danger"
                            disabled={action.pending}
                            onClick={() => void remove(product)}
                          >
                            <Trash2 size={15} />
                          </RowIconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {list.items.length > 0 && (
          <Pager meta={list.meta} onChange={list.setPage} noun="sản phẩm" disabled={list.loading} />
        )}
      </Panel>
    </div>
  );
}
