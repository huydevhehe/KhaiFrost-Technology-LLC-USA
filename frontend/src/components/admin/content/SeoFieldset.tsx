"use client";

import { MediaPicker, type MediaSelection } from "@/components/admin/shared";
import { Field, Input, Textarea } from "@/components/admin/ui";

export interface SeoValues {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  canonicalUrl: string;
  noIndex: boolean;
  ogImage: MediaSelection | null;
}

export const EMPTY_SEO: SeoValues = {
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  canonicalUrl: "",
  noIndex: false,
  ogImage: null,
};

export interface SeoFieldsetProps {
  idPrefix: string;
  value: SeoValues;
  onChange: (patch: Partial<SeoValues>) => void;
  disabled?: boolean;
  errors?: Record<string, string>;
  /** Field path prefix used to look errors up, e.g. "translations.vi". */
  errorPrefix?: string;
  className?: string;
}

/** SEO block of one locale (tiêu đề, mô tả, từ khoá, canonical, noindex, ảnh OG). */
export function SeoFieldset({
  idPrefix,
  value,
  onChange,
  disabled = false,
  errors,
  errorPrefix,
  className = "",
}: SeoFieldsetProps) {
  const errorOf = (field: string) =>
    errors?.[errorPrefix ? `${errorPrefix}.${field}` : field] ?? undefined;

  return (
    <fieldset className={`flex flex-col gap-4 ${className}`} disabled={disabled}>
      <legend className="sr-only">Tối ưu công cụ tìm kiếm</legend>
      <Field label="Tiêu đề SEO" htmlFor={`${idPrefix}-seo-title`} hint="Tối đa 120 ký tự.">
        <Input
          id={`${idPrefix}-seo-title`}
          value={value.seoTitle}
          maxLength={120}
          onChange={(event) => onChange({ seoTitle: event.target.value })}
        />
      </Field>
      <Field
        label="Mô tả SEO"
        htmlFor={`${idPrefix}-seo-description`}
        hint="Tối đa 320 ký tự."
      >
        <Textarea
          id={`${idPrefix}-seo-description`}
          rows={3}
          value={value.seoDescription}
          maxLength={320}
          onChange={(event) => onChange({ seoDescription: event.target.value })}
        />
      </Field>
      <Field
        label="Từ khoá SEO"
        htmlFor={`${idPrefix}-seo-keywords`}
        hint="Các từ khoá cách nhau bằng dấu phẩy."
      >
        <Input
          id={`${idPrefix}-seo-keywords`}
          value={value.seoKeywords}
          maxLength={500}
          onChange={(event) => onChange({ seoKeywords: event.target.value })}
        />
      </Field>
      <Field
        label="Canonical URL"
        htmlFor={`${idPrefix}-canonical`}
        hint={errorOf("canonicalUrl") ?? "Địa chỉ đầy đủ, ví dụ https://khaifrost.com/bai-viet/..."}
      >
        <Input
          id={`${idPrefix}-canonical`}
          type="url"
          value={value.canonicalUrl}
          maxLength={500}
          aria-invalid={errorOf("canonicalUrl") ? true : undefined}
          onChange={(event) => onChange({ canonicalUrl: event.target.value })}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.noIndex}
          onChange={(event) => onChange({ noIndex: event.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
        />
        Ẩn khỏi công cụ tìm kiếm (noindex)
      </label>
      <MediaPicker
        label="Ảnh chia sẻ (OG image)"
        value={value.ogImage}
        onChange={(selection) => onChange({ ogImage: selection })}
        hint="Hiển thị khi chia sẻ lên mạng xã hội."
      />
    </fieldset>
  );
}
