"use client";

import { useId } from "react";
import { Field, Input, Textarea } from "@/components/admin/ui";
import type { Locale } from "@/components/admin/shared";
import {
  CANONICAL_URL_MAX_LENGTH,
  PAGE_TITLE_MAX_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
  SEO_DESCRIPTION_RECOMMENDED,
  SEO_KEYWORDS_MAX_LENGTH,
  SEO_TITLE_MAX_LENGTH,
  SEO_TITLE_RECOMMENDED,
  type PageTranslationInput,
} from "@/lib/api/admin/pages";
import { MediaField } from "./MediaField";

/** Empty translation values, so every input stays controlled. */
export function emptyTranslation(): PageTranslationInput {
  return {
    title: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    canonicalUrl: "",
    noIndex: false,
    ogImageId: null,
  };
}

/** Fills the missing keys of a translation coming from the API. */
export function toTranslationInput(
  value: Partial<PageTranslationInput> | undefined,
): PageTranslationInput {
  return {
    title: value?.title ?? "",
    seoTitle: value?.seoTitle ?? "",
    seoDescription: value?.seoDescription ?? "",
    seoKeywords: value?.seoKeywords ?? "",
    canonicalUrl: value?.canonicalUrl ?? "",
    noIndex: value?.noIndex ?? false,
    ogImageId: value?.ogImageId ?? null,
  };
}

function Counter({ value, recommended, max }: { value: string; recommended: number; max: number }) {
  const length = value.length;
  const tone =
    length > max ? "text-red-600 font-medium" : length > recommended ? "text-amber-600" : "text-slate-400";
  return (
    <span className={`text-xs ${tone}`}>
      {length}/{recommended} ký tự khuyến nghị · tối đa {max}
    </span>
  );
}

export interface PageSeoFormProps {
  value: PageTranslationInput;
  onChange: (value: PageTranslationInput) => void;
  locale: Locale;
  /** Hide the page title input when the screen edits SEO only. */
  showTitle?: boolean;
  errors?: Record<string, string>;
  disabled?: boolean;
}

/** Title + SEO fields of one locale of a page. */
export function PageSeoForm({
  value,
  onChange,
  locale,
  showTitle = true,
  errors = {},
  disabled = false,
}: PageSeoFormProps) {
  const prefix = useId();
  const id = (name: string) => `${prefix}-${locale}-${name}`;
  const patch = (changes: Partial<PageTranslationInput>) => onChange({ ...value, ...changes });
  const error = (field: string) => errors[`translations.${locale}.${field}`] ?? errors[field];

  const renderError = (field: string) => {
    const message = error(field);
    if (!message) return null;
    return (
      <p role="alert" className="text-xs text-red-600">
        {message}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {showTitle && (
        <Field label="Tiêu đề trang" required htmlFor={id("title")}>
          <Input
            id={id("title")}
            value={value.title ?? ""}
            maxLength={PAGE_TITLE_MAX_LENGTH}
            disabled={disabled}
            onChange={(event) => patch({ title: event.target.value })}
          />
          {renderError("title")}
        </Field>
      )}

      <Field label="Tiêu đề SEO" htmlFor={id("seoTitle")}>
        <Input
          id={id("seoTitle")}
          value={value.seoTitle ?? ""}
          maxLength={SEO_TITLE_MAX_LENGTH}
          disabled={disabled}
          placeholder={value.title ?? ""}
          onChange={(event) => patch({ seoTitle: event.target.value })}
        />
        <Counter
          value={value.seoTitle ?? ""}
          recommended={SEO_TITLE_RECOMMENDED}
          max={SEO_TITLE_MAX_LENGTH}
        />
        {renderError("seoTitle")}
      </Field>

      <Field label="Mô tả SEO" htmlFor={id("seoDescription")}>
        <Textarea
          id={id("seoDescription")}
          rows={3}
          value={value.seoDescription ?? ""}
          maxLength={SEO_DESCRIPTION_MAX_LENGTH}
          disabled={disabled}
          onChange={(event) => patch({ seoDescription: event.target.value })}
        />
        <Counter
          value={value.seoDescription ?? ""}
          recommended={SEO_DESCRIPTION_RECOMMENDED}
          max={SEO_DESCRIPTION_MAX_LENGTH}
        />
        {renderError("seoDescription")}
      </Field>

      <Field
        label="Từ khoá"
        htmlFor={id("seoKeywords")}
        hint="Phân tách bằng dấu phẩy."
      >
        <Input
          id={id("seoKeywords")}
          value={value.seoKeywords ?? ""}
          maxLength={SEO_KEYWORDS_MAX_LENGTH}
          disabled={disabled}
          onChange={(event) => patch({ seoKeywords: event.target.value })}
        />
        {renderError("seoKeywords")}
      </Field>

      <Field
        label="Canonical URL"
        htmlFor={id("canonicalUrl")}
        hint="Để trống nếu dùng đường dẫn mặc định. Phải là URL đầy đủ (https://…)."
      >
        <Input
          id={id("canonicalUrl")}
          value={value.canonicalUrl ?? ""}
          maxLength={CANONICAL_URL_MAX_LENGTH}
          disabled={disabled}
          placeholder="https://khaifrost.com/duong-dan"
          onChange={(event) => patch({ canonicalUrl: event.target.value })}
        />
        {renderError("canonicalUrl")}
      </Field>

      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={value.noIndex === true}
          disabled={disabled}
          onChange={(event) => patch({ noIndex: event.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-2 focus:ring-accent/30"
        />
        Ẩn khỏi công cụ tìm kiếm (noindex)
      </label>

      <MediaField
        label="Ảnh chia sẻ (OG image)"
        value={value.ogImageId ?? null}
        onChange={(mediaId) => patch({ ogImageId: mediaId })}
        disabled={disabled}
        error={error("ogImageId")}
        hint="Ảnh hiển thị khi chia sẻ trang lên mạng xã hội."
        folder="seo"
      />
    </div>
  );
}

export interface GoogleSnippetProps {
  path: string;
  title: string;
  description: string;
  siteHost?: string;
}

/** Google result preview used by the SEO screens. */
export function GoogleSnippet({
  path,
  title,
  description,
  siteHost = "khaifrost.com",
}: GoogleSnippetProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="truncate text-xs text-slate-600">
        {siteHost} {path === "/" ? "" : `› ${path.replace(/^\//, "").split("/").join(" › ")}`}
      </p>
      <p className="mt-1 truncate text-lg text-[#1a0dab]">{title || "Tiêu đề trang"}</p>
      <p className="mt-1 line-clamp-3 text-sm text-[#4d5156]">
        {description || "Mô tả trang sẽ hiển thị ở đây."}
      </p>
    </div>
  );
}
