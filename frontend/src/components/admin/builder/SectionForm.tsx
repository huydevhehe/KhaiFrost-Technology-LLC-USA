"use client";

import { useId } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/admin/ui";
import { RichTextEditor, type Locale } from "@/components/admin/shared";
import type {
  SectionContent,
  SectionFieldDefinition,
  SectionTypeDefinition,
} from "@/lib/api/admin/pages";
import { MediaField } from "./MediaField";
import {
  addListItem,
  moveListItem,
  readList,
  readListText,
  readShared,
  readTranslated,
  removeListItem,
  textValue,
  writeList,
  writeListText,
  writeShared,
  writeTranslated,
  type ContentErrors,
} from "./contentModel";

/** Vietnamese wording for the small option sets the registry uses. */
const OPTION_LABELS: Record<string, string> = {
  left: "Trái",
  center: "Giữa",
  right: "Phải",
  default: "Mặc định",
  centered: "Căn giữa",
  split: "Chia đôi",
  newest: "Mới nhất",
  oldest: "Cũ nhất",
  featured: "Nổi bật",
  posts: "Bài viết",
  products: "Sản phẩm",
  projects: "Dự án",
  services: "Dịch vụ",
  testimonials: "Đánh giá",
  "client-locations": "Khách hàng theo khu vực",
  "2": "2 cột",
  "3": "3 cột",
  "4": "4 cột",
};

const optionLabel = (value: string) => OPTION_LABELS[value] ?? value;

function CharacterCount({ value, max }: { value: string; max?: number }) {
  if (!max) return null;
  const over = value.length > max;
  return (
    <span className={`text-xs ${over ? "font-medium text-red-600" : "text-slate-400"}`}>
      {value.length}/{max}
    </span>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-xs text-red-600">
      {message}
    </p>
  );
}

export interface SectionFormProps {
  definition: SectionTypeDefinition;
  content: SectionContent;
  onChange: (content: SectionContent) => void;
  /** Locale the translatable inputs are bound to. */
  locale: Locale;
  /** Messages keyed by the server's field paths (shared.x, translations.vi.x…). */
  errors?: ContentErrors;
  disabled?: boolean;
}

/**
 * Renders the editing form of one section straight from its type definition, so a
 * new section type on the server needs no frontend change.
 */
export function SectionForm({
  definition,
  content,
  onChange,
  locale,
  errors = {},
  disabled = false,
}: SectionFormProps) {
  const prefix = useId();

  const renderScalar = (
    field: SectionFieldDefinition,
    options: {
      value: unknown;
      onValue: (value: unknown) => void;
      path: string;
      idSuffix: string;
      compact?: boolean;
    },
  ) => {
    const { value, onValue, path, idSuffix } = options;
    const controlId = `${prefix}-${idSuffix}`;
    const error = errors[path];
    const label = field.label.vi;
    const text = textValue(value);

    if (field.kind === "media") {
      return (
        <div key={field.key} className="flex flex-col gap-1.5">
          <MediaField
            label={label}
            required={field.required}
            value={typeof value === "string" ? value : null}
            onChange={(id) => onValue(id ?? undefined)}
            disabled={disabled}
            error={error}
            folder="pages"
          />
        </div>
      );
    }

    if (field.kind === "richtext") {
      return (
        <div key={field.key} className="flex flex-col gap-1.5">
          <span id={`${controlId}-label`} className="text-sm font-medium text-slate-700">
            {label}
            {field.required && <span className="text-red-500"> *</span>}
          </span>
          <RichTextEditor
            id={controlId}
            aria-labelledby={`${controlId}-label`}
            value={text}
            onChange={(html) => onValue(html)}
            disabled={disabled}
            mediaFolder="pages"
          />
          <FieldError message={error} />
        </div>
      );
    }

    if (field.kind === "boolean") {
      return (
        <div key={field.key} className="flex flex-col gap-1.5">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              id={controlId}
              type="checkbox"
              checked={value === true}
              disabled={disabled}
              onChange={(event) => onValue(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-2 focus:ring-accent/30"
            />
            {label}
          </label>
          <FieldError message={error} />
        </div>
      );
    }

    if (field.kind === "select") {
      return (
        <Field key={field.key} label={label} required={field.required} htmlFor={controlId}>
          <Select
            id={controlId}
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(event) => onValue(event.target.value === "" ? undefined : event.target.value)}
          >
            <option value="">— Không chọn —</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {optionLabel(option)}
              </option>
            ))}
          </Select>
          <FieldError message={error} />
        </Field>
      );
    }

    if (field.kind === "number") {
      return (
        <Field key={field.key} label={label} required={field.required} htmlFor={controlId}>
          <Input
            id={controlId}
            type="number"
            value={typeof value === "number" ? String(value) : text}
            min={field.min}
            max={field.max}
            step={field.integer ? 1 : "any"}
            disabled={disabled}
            onChange={(event) => {
              const raw = event.target.value;
              onValue(raw === "" ? undefined : Number(raw));
            }}
          />
          <FieldError message={error} />
        </Field>
      );
    }

    if (field.kind === "textarea") {
      return (
        <Field key={field.key} label={label} required={field.required} htmlFor={controlId}>
          <Textarea
            id={controlId}
            rows={3}
            value={text}
            disabled={disabled}
            onChange={(event) => onValue(event.target.value)}
          />
          <div className="flex items-center justify-between gap-2">
            <FieldError message={error} />
            <CharacterCount value={text} max={field.maxLength} />
          </div>
        </Field>
      );
    }

    // text and url
    return (
      <Field
        key={field.key}
        label={label}
        required={field.required}
        htmlFor={controlId}
        hint={
          field.kind === "url"
            ? "Liên kết http(s) hoặc đường dẫn nội bộ bắt đầu bằng /."
            : undefined
        }
      >
        <Input
          id={controlId}
          value={text}
          disabled={disabled}
          inputMode={field.kind === "url" ? "url" : undefined}
          onChange={(event) => onValue(event.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <FieldError message={error} />
          <CharacterCount value={text} max={field.maxLength} />
        </div>
      </Field>
    );
  };

  const renderField = (field: SectionFieldDefinition) => {
    if (field.kind === "list") return renderList(field);
    if (field.translatable) {
      return renderScalar(field, {
        value: readTranslated(content, locale, field.key),
        onValue: (value) => onChange(writeTranslated(content, locale, field.key, value)),
        path: `translations.${locale}.${field.key}`,
        idSuffix: `${locale}-${field.key}`,
      });
    }
    return renderScalar(field, {
      value: readShared(content, field.key),
      onValue: (value) => onChange(writeShared(content, field.key, value)),
      path: `shared.${field.key}`,
      idSuffix: `shared-${field.key}`,
    });
  };

  const renderList = (field: SectionFieldDefinition) => {
    const items = readList(content, field.key);
    const max = field.maxItems ?? 50;
    return (
      <div key={field.key} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {field.label.vi}
              {field.required && <span className="text-red-500"> *</span>}
            </p>
            <p className="text-xs text-slate-400">
              {items.length}/{max} mục
            </p>
          </div>
          <button
            type="button"
            disabled={disabled || items.length >= max}
            onClick={() => onChange(addListItem(content, field.key))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
          >
            <Plus size={14} />
            Thêm mục
          </button>
        </div>

        <FieldError message={errors[`shared.${field.key}`]} />

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500">
            Chưa có mục nào.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item, index) => (
              <li key={String(item.id)} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">Mục {index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={disabled || index === 0}
                      onClick={() => onChange(moveListItem(content, field.key, index, -1))}
                      aria-label={`Di chuyển mục ${index + 1} lên trên`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-30"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index === items.length - 1}
                      onClick={() => onChange(moveListItem(content, field.key, index, 1))}
                      aria-label={`Di chuyển mục ${index + 1} xuống dưới`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white hover:text-slate-900 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-30"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange(removeListItem(content, field.key, String(item.id)))}
                      aria-label={`Xoá mục ${index + 1}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {(field.itemFields ?? []).map((itemField) =>
                    itemField.translatable
                      ? renderScalar(itemField, {
                          value: readListText(content, locale, field.key, String(item.id), itemField.key),
                          onValue: (value) =>
                            onChange(
                              writeListText(
                                content,
                                locale,
                                field.key,
                                String(item.id),
                                itemField.key,
                                value,
                              ),
                            ),
                          path: `translations.${locale}.${field.key}.${item.id}.${itemField.key}`,
                          idSuffix: `${locale}-${field.key}-${item.id}-${itemField.key}`,
                        })
                      : renderScalar(itemField, {
                          value: item[itemField.key],
                          onValue: (value) => {
                            const next = [...items];
                            const copy = { ...next[index] };
                            if (value === undefined) delete copy[itemField.key];
                            else copy[itemField.key] = value;
                            next[index] = copy;
                            onChange(writeList(content, field.key, next));
                          },
                          path: `shared.${field.key}[${index}].${itemField.key}`,
                          idSuffix: `shared-${field.key}-${item.id}-${itemField.key}`,
                        }),
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return <div className="flex flex-col gap-5">{definition.fields.map(renderField)}</div>;
}
