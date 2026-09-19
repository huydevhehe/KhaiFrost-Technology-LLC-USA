"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string | null;
  placeholder?: string;
  /** Maximum number of entries accepted by the backend. */
  max?: number;
  /** Maximum length of a single entry. */
  maxLength?: number;
  hint?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Chip list edited with Enter/comma — used for tags, công nghệ and tính năng. */
export function TagInput({
  value,
  onChange,
  label = "Thẻ",
  placeholder = "Nhập rồi nhấn Enter",
  max,
  maxLength,
  hint,
  error,
  disabled = false,
  id,
  className = "",
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const full = max !== undefined && value.length >= max;

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const part of parts) {
      const entry = maxLength ? part.slice(0, maxLength) : part;
      if (next.includes(entry)) continue;
      if (max !== undefined && next.length >= max) break;
      next.push(entry);
    }
    onChange(next);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
      return;
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label !== null && (
        <label htmlFor={controlId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
          >
            {item}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(value.filter((entry) => entry !== item))}
              aria-label={`Xoá ${item}`}
              className="text-slate-400 transition-colors hover:text-red-600 disabled:opacity-40"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={controlId}
          value={draft}
          disabled={disabled || full}
          placeholder={full ? `Đã đạt tối đa ${max}` : placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          maxLength={maxLength}
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-60"
        />
      </div>
      {max !== undefined && !error && (
        <p className="text-xs text-slate-400">
          {value.length}/{max}
          {hint ? ` · ${hint}` : ""}
        </p>
      )}
      {max === undefined && hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
