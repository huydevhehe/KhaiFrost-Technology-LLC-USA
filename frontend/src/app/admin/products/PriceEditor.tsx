"use client";

import { Plus, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/admin/content";
import { Input, Select } from "@/components/admin/ui";
import {
  BILLING_PERIODS,
  BILLING_PERIOD_LABELS,
  CURRENCIES,
  type BillingPeriod,
  type Currency,
} from "@/lib/api/admin/products";

export interface PriceRow {
  key: string;
  currency: Currency;
  amount: string;
  billingPeriod: BillingPeriod;
  isDefault: boolean;
}

export const AMOUNT_PATTERN = /^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,2})?$/;

/** Vietnamese validation message for the whole price table, or null. */
export function validatePrices(rows: readonly PriceRow[]): string | null {
  const seen = new Set<string>();
  const defaults = new Map<Currency, number>();
  for (const row of rows) {
    if (!AMOUNT_PATTERN.test(row.amount.trim())) {
      return "Giá phải là số dương, tối đa 2 chữ số thập phân.";
    }
    if (row.currency === "VND" && !/^\d+(\.0{1,2})?$/.test(row.amount.trim())) {
      return "Giá VND phải là số nguyên (không có phần thập phân).";
    }
    const key = `${row.currency}:${row.billingPeriod}`;
    if (seen.has(key)) {
      return `Trùng mức giá ${row.currency} · ${BILLING_PERIOD_LABELS[row.billingPeriod]}.`;
    }
    seen.add(key);
    if (row.isDefault) defaults.set(row.currency, (defaults.get(row.currency) ?? 0) + 1);
  }
  for (const [currency, count] of defaults) {
    if (count > 1) return `Mỗi loại tiền chỉ được một mức giá mặc định (${currency}).`;
  }
  return null;
}

export interface PriceEditorProps {
  value: PriceRow[];
  onChange: (rows: PriceRow[]) => void;
  disabled?: boolean;
  error?: string;
  /** Explains why the table is locked (giá theo yêu cầu). */
  lockedHint?: string;
}

/** Bảng giá: currency, amount, billing period and one default per currency. */
export function PriceEditor({
  value,
  onChange,
  disabled = false,
  error,
  lockedHint,
}: PriceEditorProps) {
  const patch = (key: string, changes: Partial<PriceRow>) =>
    onChange(value.map((row) => (row.key === key ? { ...row, ...changes } : row)));

  const add = () =>
    onChange([
      ...value,
      {
        key: `price-${Date.now()}-${value.length}`,
        currency: "USD",
        amount: "",
        billingPeriod: "one_time",
        isDefault: value.length === 0,
      },
    ]);

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-sm text-slate-500">
          {lockedHint ?? "Chưa có mức giá nào."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {value.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-2"
            >
              <Select
                aria-label="Loại tiền"
                className="w-28"
                value={row.currency}
                disabled={disabled}
                onChange={(event) => patch(row.key, { currency: event.target.value as Currency })}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Số tiền"
                className="w-36"
                inputMode="decimal"
                placeholder="199.00"
                value={row.amount}
                disabled={disabled}
                onChange={(event) => patch(row.key, { amount: event.target.value })}
              />
              <Select
                aria-label="Chu kỳ thanh toán"
                className="w-40"
                value={row.billingPeriod}
                disabled={disabled}
                onChange={(event) =>
                  patch(row.key, { billingPeriod: event.target.value as BillingPeriod })
                }
              >
                {BILLING_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {BILLING_PERIOD_LABELS[period]}
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={row.isDefault}
                  disabled={disabled}
                  onChange={(event) => patch(row.key, { isDefault: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                Mặc định
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((item) => item.key !== row.key))}
                aria-label="Xoá mức giá"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-40"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <ActionButton variant="secondary" icon={<Plus size={14} />} disabled={disabled} onClick={add}>
          Thêm mức giá
        </ActionButton>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
