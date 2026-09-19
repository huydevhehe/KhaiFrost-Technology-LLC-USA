"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/admin/ui";

export type FlatMap = Record<string, string | number>;

export interface KeyValueEditorProps {
  value: FlatMap;
  onChange: (value: FlatMap) => void;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/** Flat key/value map editor (thông số kỹ thuật của sản phẩm). */
export function KeyValueEditor({
  value,
  onChange,
  label = "Thông số kỹ thuật",
  hint,
  error,
  disabled = false,
  className = "",
}: KeyValueEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const entries = Object.entries(value);

  const addEntry = () => {
    const key = newKey.trim();
    if (!key) return;
    onChange({ ...value, [key]: newValue.trim() });
    setNewKey("");
    setNewValue("");
  };

  const renameKey = (oldKey: string, nextKey: string) => {
    const trimmed = nextKey.trim();
    if (!trimmed || trimmed === oldKey) return;
    const next: FlatMap = {};
    for (const [key, entry] of Object.entries(value)) next[key === oldKey ? trimmed : key] = entry;
    onChange(next);
  };

  const removeKey = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
        {entries.length === 0 ? (
          <p className="py-2 text-center text-sm text-slate-500">Chưa có thông số nào.</p>
        ) : (
          entries.map(([key, entry]) => (
            <div key={key} className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`Tên thông số ${key}`}
                defaultValue={key}
                disabled={disabled}
                onBlur={(event) => renameKey(key, event.target.value)}
                className="min-w-[8rem] flex-1"
              />
              <Input
                aria-label={`Giá trị của ${key}`}
                value={String(entry)}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, [key]: event.target.value })}
                className="min-w-[8rem] flex-[2]"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeKey(key)}
                aria-label={`Xoá thông số ${key}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-40"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <Input
            aria-label="Tên thông số mới"
            placeholder="CPU"
            value={newKey}
            disabled={disabled}
            onChange={(event) => setNewKey(event.target.value)}
            className="min-w-[8rem] flex-1"
          />
          <Input
            aria-label="Giá trị thông số mới"
            placeholder="4 vCPU"
            value={newValue}
            disabled={disabled}
            onChange={(event) => setNewValue(event.target.value)}
            className="min-w-[8rem] flex-[2]"
          />
          <button
            type="button"
            disabled={disabled || newKey.trim() === ""}
            onClick={addEntry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
          >
            <Plus size={14} />
            Thêm
          </button>
        </div>
      </div>
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
