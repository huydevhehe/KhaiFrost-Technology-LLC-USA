"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ImageOff } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { ActionButton, Alert } from "@/components/account/ui";
import { accountApi } from "@/lib/api/account";
import { describeApiError } from "@/lib/api/errorMessages";
import type { ProductCard } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

const PAGE_SIZE = 12;

function priceLabel(product: ProductCard): string {
  if (product.priceOnRequest) return "Liên hệ báo giá";
  const price = product.prices.find((p) => p.isDefault) ?? product.prices[0];
  if (!price) return "Liên hệ báo giá";
  const period = price.billingPeriod === "monthly" ? " / tháng" : price.billingPeriod === "yearly" ? " / năm" : "";
  return `${formatMoney(price.amount, price.currency)}${period}`;
}

export default function FavoritesPage() {
  const [items, setItems] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const result = await accountApi.favorites.list({ page: targetPage, pageSize: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.meta.total);
      setTotalPages(Math.max(1, result.meta.totalPages));
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load(page);
    })();
  }, [load, page]);

  async function remove(productId: string) {
    setRemoving(productId);
    try {
      await accountApi.favorites.remove(productId);
      const remaining = items.filter((p) => p.id !== productId);
      if (remaining.length === 0 && page > 1) setPage(page - 1);
      else await load(page);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Sản phẩm yêu thích</h1>
        <p className="mt-1 text-sm text-slate-500">{total > 0 ? `${total} sản phẩm bạn đã lưu` : "Danh sách sản phẩm bạn đã lưu."}</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading && items.length === 0 && !error && <p className="text-sm text-slate-400">Đang tải...</p>}

      {!loading && !error && items.length === 0 && (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Heart size={24} />
            </span>
            <p className="font-medium text-slate-800">Bạn chưa có sản phẩm yêu thích nào</p>
            <p className="max-w-sm text-sm text-slate-500">
              Khi khám phá sản phẩm, hãy nhấn vào biểu tượng trái tim để lưu lại và xem sau tại đây.
            </p>
            <Link href="/" className="mt-1 text-sm font-medium text-accent hover:underline">
              Về trang chủ
            </Link>
          </div>
        </Panel>
      )}

      {items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <li key={product.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="relative flex aspect-[16/9] items-center justify-center bg-slate-100 text-slate-300">
                {product.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.coverImageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff size={28} />
                )}
                <button
                  type="button"
                  onClick={() => remove(product.id)}
                  disabled={removing === product.id}
                  title="Bỏ khỏi yêu thích"
                  aria-label={`Bỏ ${product.name} khỏi yêu thích`}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-500 shadow hover:bg-white disabled:opacity-50"
                >
                  <Heart size={17} fill="currentColor" />
                </button>
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-slate-900">{product.name}</h2>
                {product.tagline && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.tagline}</p>}
                <p className="mt-3 text-sm font-semibold text-accent">{priceLabel(product)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <ActionButton variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Trước
          </ActionButton>
          <span className="text-sm text-slate-500">
            Trang {page} / {totalPages}
          </span>
          <ActionButton variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            Sau
          </ActionButton>
        </div>
      )}
    </div>
  );
}
