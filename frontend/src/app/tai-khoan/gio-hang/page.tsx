"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ImageOff, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { ActionButton, Alert } from "@/components/account/ui";
import { accountApi } from "@/lib/api/account";
import { describeApiError } from "@/lib/api/errorMessages";
import type { BillingPeriod, Cart, CartItem, CartItemUnavailableReason } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

const MAX_QUANTITY = 99;

const periodLabel: Record<BillingPeriod, string> = {
  one_time: "Trả một lần",
  monthly: "Theo tháng",
  yearly: "Theo năm",
};

const unavailableLabel: Record<CartItemUnavailableReason, string> = {
  PRODUCT_REMOVED: "Sản phẩm đã bị gỡ",
  PRODUCT_UNPUBLISHED: "Sản phẩm tạm ngừng bán",
  PRICE_ON_REQUEST: "Sản phẩm chuyển sang báo giá",
  PRICE_REMOVED: "Gói giá này không còn",
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCart(await accountApi.cart.get("vi"));
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function run(key: string, action: () => Promise<Cart>) {
    setBusy(key);
    try {
      setCart(await action());
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(null);
    }
  }

  const items = cart?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Giỏ hàng</h1>
          <p className="mt-1 text-sm text-slate-500">
            {cart && items.length > 0 ? `${cart.itemCount} sản phẩm trong giỏ` : "Sản phẩm bạn đã thêm vào giỏ."}
          </p>
        </div>
        {items.length > 0 && (
          <ActionButton variant="danger" disabled={busy !== null} onClick={() => run("clear", () => accountApi.cart.clear("vi"))}>
            <Trash2 size={15} />
            Xoá toàn bộ
          </ActionButton>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {!cart && !error && <p className="text-sm text-slate-400">Đang tải...</p>}

      {cart && items.length === 0 && (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ShoppingCart size={24} />
            </span>
            <p className="font-medium text-slate-800">Giỏ hàng của bạn đang trống</p>
            <p className="max-w-sm text-sm text-slate-500">Các sản phẩm bạn thêm vào giỏ sẽ hiển thị tại đây.</p>
            <Link href="/" className="mt-1 text-sm font-medium text-accent hover:underline">
              Về trang chủ
            </Link>
          </div>
        </Panel>
      )}

      {cart && items.length > 0 && (
        <>
          {(cart.hasPriceChanges || cart.hasUnavailableItems) && (
            <Alert tone="info">
              {cart.hasPriceChanges && "Một số sản phẩm đã thay đổi giá kể từ lúc bạn thêm vào giỏ. "}
              {cart.hasUnavailableItems && "Một số sản phẩm hiện không thể mua và không được tính vào tổng."}
            </Alert>
          )}

          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                busy={busy !== null}
                onQuantity={(q) => run(item.id, () => accountApi.cart.updateItem(item.id, q, "vi"))}
                onRemove={() => run(item.id, () => accountApi.cart.removeItem(item.id, "vi"))}
              />
            ))}
          </ul>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">
                  Tổng cộng ({cart.totalQuantity} sản phẩm{cart.currency ? `, ${cart.currency}` : ""})
                </p>
                <p className="text-2xl font-bold text-slate-900">{formatMoney(cart.total, cart.currency)}</p>
              </div>
              <p className="max-w-xs text-sm text-slate-500">Thanh toán sẽ sớm có mặt.</p>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function CartRow({
  item,
  busy,
  onQuantity,
  onRemove,
}: {
  item: CartItem;
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const name = item.product?.name ?? "Sản phẩm không còn tồn tại";
  return (
    <li
      className={`flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4 shadow-sm ${
        item.unavailable ? "border-amber-200 bg-amber-50/40" : "border-slate-200"
      }`}
    >
      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-300">
        {item.product?.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.product.coverImageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={20} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{periodLabel[item.billingPeriod]}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {item.unavailable && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {item.unavailableReason ? unavailableLabel[item.unavailableReason] : "Không khả dụng"}
            </span>
          )}
          {item.priceChanged && !item.unavailable && (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
              Giá đã đổi: {formatMoney(item.snapshotUnitPrice, item.currency)} → {formatMoney(item.unitPrice, item.currency)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={busy || item.quantity <= 1 || !item.allowsQuantity}
          onClick={() => onQuantity(item.quantity - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          aria-label="Giảm số lượng"
        >
          <Minus size={14} />
        </button>
        <span className="w-9 text-center text-sm font-medium">{item.quantity}</span>
        <button
          type="button"
          disabled={busy || item.quantity >= MAX_QUANTITY || !item.allowsQuantity}
          onClick={() => onQuantity(item.quantity + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          aria-label="Tăng số lượng"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="w-32 text-right">
        <p className="font-semibold text-slate-900">{item.unavailable ? "—" : formatMoney(item.lineTotal, item.currency)}</p>
        {item.quantity > 1 && !item.unavailable && (
          <p className="text-xs text-slate-400">{formatMoney(item.unitPrice, item.currency)} / cái</p>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onRemove}
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
        aria-label={`Xoá ${name} khỏi giỏ`}
        title="Xoá khỏi giỏ"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
