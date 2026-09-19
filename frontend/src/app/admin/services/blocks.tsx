"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { LOCALES, MediaPicker, type Locale, type MediaSelection } from "@/components/admin/shared";
import { ActionButton, SLUG_PATTERN, TagInput } from "@/components/admin/content";
import { Field, Input, Select } from "@/components/admin/ui";
import {
  CATEGORY_ICON_KEYS,
  DURATION_LABEL_PATTERN,
  describeCtaHrefProblem,
} from "@/lib/api/admin/serviceCatalog";

/** Vietnamese labels of the icons a block can use. */
const ICON_LABELS: Record<string, string> = {
  rocket: "Tên lửa",
  trendingUp: "Tăng trưởng",
  clock: "Đồng hồ",
  users: "Nhóm người",
  search: "Tìm kiếm",
  lightbulb: "Bóng đèn",
  settings: "Cài đặt",
  lineChart: "Biểu đồ đường",
  briefcase: "Cặp tài liệu",
  bolt: "Tia sét",
  shield: "Khiên bảo vệ",
  headset: "Tai nghe hỗ trợ",
  eye: "Con mắt",
  target: "Mục tiêu",
  calendar: "Lịch",
  globe: "Quả địa cầu",
  heart: "Trái tim",
};

export interface BlockFieldConfig {
  key: string;
  label: string;
  max: number;
  multiline?: boolean;
  /** Needed in both languages before the service can be published. */
  required?: boolean;
}

export interface BlockConfig {
  /** Lowercase noun used in messages, e.g. "số liệu". */
  noun: string;
  max: number;
  fields: BlockFieldConfig[];
  icon?: boolean;
  value?: boolean;
  image?: string;
  duration?: boolean;
  anchor?: boolean;
  tags?: boolean;
  authorName?: boolean;
  ctaHref?: boolean;
}

export interface BlockForm {
  key: string;
  iconKey: string;
  value: string;
  image: MediaSelection | null;
  durationLabel: string;
  anchor: string;
  tags: string[];
  authorName: string;
  ctaHref: string;
  texts: Record<Locale, Record<string, string>>;
}

/** The union of everything a block coming from the server can carry. */
export interface RawBlock {
  iconKey?: string;
  value?: string;
  imageId?: string | null;
  imageUrl?: string | null;
  avatarId?: string | null;
  avatarUrl?: string | null;
  durationLabel?: string | null;
  anchor?: string | null;
  tags?: string[];
  authorName?: string;
  ctaHref?: string;
  translations: Partial<Record<Locale, Record<string, string | null>>>;
}

function newKey(): string {
  return `block-${crypto.randomUUID()}`;
}

export function emptyBlock(config: BlockConfig): BlockForm {
  const texts = {} as Record<Locale, Record<string, string>>;
  for (const locale of LOCALES) {
    texts[locale] = Object.fromEntries(config.fields.map((field) => [field.key, ""]));
  }
  return {
    key: newKey(),
    iconKey: config.icon ? CATEGORY_ICON_KEYS[0] : "",
    value: "",
    image: null,
    durationLabel: "",
    anchor: "",
    tags: [],
    authorName: "",
    ctaHref: "",
    texts,
  };
}

export function blockFromServer(raw: RawBlock, config: BlockConfig): BlockForm {
  const block = emptyBlock(config);
  const id = raw.imageId ?? raw.avatarId ?? null;
  const url = raw.imageUrl ?? raw.avatarUrl ?? null;
  for (const locale of LOCALES) {
    for (const field of config.fields) {
      block.texts[locale][field.key] = raw.translations[locale]?.[field.key] ?? "";
    }
  }
  return {
    ...block,
    iconKey: raw.iconKey ?? block.iconKey,
    value: raw.value ?? "",
    image: id && url ? { id, url, thumbnailUrl: url, name: "Ảnh" } : null,
    durationLabel: raw.durationLabel ?? "",
    anchor: raw.anchor ?? "",
    tags: raw.tags ?? [],
    authorName: raw.authorName ?? "",
    ctaHref: raw.ctaHref ?? "",
  };
}

/** Request body of one block; only the properties its config uses are sent. */
export function blockToInput(block: BlockForm, config: BlockConfig): Record<string, unknown> {
  const translations: Record<string, Record<string, string | null>> = {};
  for (const locale of LOCALES) {
    translations[locale] = {};
    for (const field of config.fields) {
      const text = block.texts[locale][field.key].trim();
      translations[locale][field.key] = text || null;
    }
  }
  const input: Record<string, unknown> = { translations };
  if (config.icon) input.iconKey = block.iconKey;
  if (config.value) input.value = block.value.trim();
  if (config.image) input.imageId = block.image?.id ?? null;
  if (config.authorName) {
    input.authorName = block.authorName.trim();
    input.avatarId = block.image?.id ?? null;
    delete input.imageId;
  }
  if (config.duration) input.durationLabel = block.durationLabel.trim() || null;
  if (config.anchor) input.anchor = block.anchor.trim() || null;
  if (config.tags) input.tags = block.tags;
  if (config.ctaHref) input.ctaHref = block.ctaHref.trim();
  return input;
}

/** First problem found in a block (Vietnamese), or null. */
export function blockProblem(block: BlockForm, config: BlockConfig): string | null {
  if (config.value && !block.value.trim()) return "Nhập giá trị hiển thị.";
  if (config.authorName && !block.authorName.trim()) return "Nhập tên người nhận xét.";
  if (config.duration && block.durationLabel.trim() && !DURATION_LABEL_PATTERN.test(block.durationLabel.trim())) {
    return "Thời lượng phải có dạng mm:ss, ví dụ 02:15.";
  }
  if (config.anchor && block.anchor.trim() && !SLUG_PATTERN.test(block.anchor.trim())) {
    return "Neo liên kết chỉ gồm chữ thường, số và dấu gạch ngang.";
  }
  if (config.ctaHref) return describeCtaHrefProblem(block.ctaHref);
  return null;
}

/** Locales in which a required text of the block is still empty. */
export function blockMissingLocales(block: BlockForm, config: BlockConfig): Locale[] {
  return LOCALES.filter((locale) =>
    config.fields.some((field) => field.required && !block.texts[locale][field.key].trim()),
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

interface BlockFieldsProps {
  idPrefix: string;
  config: BlockConfig;
  block: BlockForm;
  onChange: (patch: Partial<BlockForm>) => void;
  disabled: boolean;
}

/** All inputs of one block: shared properties, then vi / en texts side by side. */
export function BlockFields({ idPrefix, config, block, onChange, disabled }: BlockFieldsProps) {
  const setText = (locale: Locale, key: string, text: string) =>
    onChange({ texts: { ...block.texts, [locale]: { ...block.texts[locale], [key]: text } } });
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-3">
      {(config.icon || config.value || config.authorName || config.ctaHref) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {config.icon && (
            <Field label="Biểu tượng" htmlFor={`${idPrefix}-icon`}>
              <Select
                id={`${idPrefix}-icon`}
                value={block.iconKey}
                onChange={(event) => onChange({ iconKey: event.target.value })}
              >
                {CATEGORY_ICON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {ICON_LABELS[key] ?? key}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {config.value && (
            <Field label="Giá trị" htmlFor={`${idPrefix}-value`} required hint="Ví dụ: 500+, 99,9%">
              <Input
                id={`${idPrefix}-value`}
                value={block.value}
                maxLength={40}
                onChange={(event) => onChange({ value: event.target.value })}
              />
            </Field>
          )}
          {config.authorName && (
            <Field label="Tên người nhận xét" htmlFor={`${idPrefix}-author`} required>
              <Input
                id={`${idPrefix}-author`}
                value={block.authorName}
                maxLength={120}
                onChange={(event) => onChange({ authorName: event.target.value })}
              />
            </Field>
          )}
          {config.ctaHref && (
            <Field
              label="Liên kết nút"
              htmlFor={`${idPrefix}-cta`}
              required
              hint="Địa chỉ http(s) hoặc đường dẫn nội bộ như /lien-he."
            >
              <Input
                id={`${idPrefix}-cta`}
                value={block.ctaHref}
                maxLength={500}
                onChange={(event) => onChange({ ctaHref: event.target.value })}
              />
            </Field>
          )}
        </div>
      )}
      {(config.duration || config.anchor) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {config.duration && (
            <Field label="Thời lượng" htmlFor={`${idPrefix}-duration`} hint="Định dạng mm:ss, ví dụ 02:15.">
              <Input
                id={`${idPrefix}-duration`}
                value={block.durationLabel}
                maxLength={10}
                onChange={(event) => onChange({ durationLabel: event.target.value })}
              />
            </Field>
          )}
          {config.anchor && (
            <Field label="Neo liên kết" htmlFor={`${idPrefix}-anchor`} hint="Chữ thường, ví dụ ai-chatbot.">
              <Input
                id={`${idPrefix}-anchor`}
                value={block.anchor}
                maxLength={100}
                onChange={(event) => onChange({ anchor: event.target.value })}
              />
            </Field>
          )}
        </div>
      )}
      {config.tags && (
        <TagInput
          label="Thẻ"
          value={block.tags}
          onChange={(tags) => onChange({ tags })}
          max={20}
          maxLength={40}
          disabled={disabled}
        />
      )}
      {(config.image || config.authorName) && (
        <MediaPicker
          label={config.image ?? "Ảnh đại diện"}
          value={block.image}
          onChange={(image) => onChange({ image })}
          disabled={disabled}
          folder="dich-vu"
        />
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LOCALES.map((locale) => (
          <div key={locale} className="flex flex-col gap-3">
            {config.fields.map((field) => {
              const id = `${idPrefix}-${field.key}-${locale}`;
              const label = `${field.label} (${locale.toUpperCase()})`;
              return (
                <Field key={field.key} label={label} htmlFor={id} required={field.required}>
                  {field.multiline ? (
                    <textarea
                      id={id}
                      rows={3}
                      value={block.texts[locale][field.key]}
                      maxLength={field.max}
                      onChange={(event) => setText(locale, field.key, event.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <Input
                      id={id}
                      value={block.texts[locale][field.key]}
                      maxLength={field.max}
                      onChange={(event) => setText(locale, field.key, event.target.value)}
                    />
                  )}
                </Field>
              );
            })}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

interface BlockListEditorProps {
  idPrefix: string;
  config: BlockConfig;
  blocks: BlockForm[];
  onChange: (blocks: BlockForm[]) => void;
  disabled: boolean;
  /** Text shown when the list is empty. */
  emptyText?: string;
}

/** Ordered list of repeated content blocks: add, reorder, remove, edit. */
export function BlockListEditor({
  idPrefix,
  config,
  blocks,
  onChange,
  disabled,
  emptyText,
}: BlockListEditorProps) {
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = blocks.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 && (
        <p className="text-sm text-slate-500">{emptyText ?? `Chưa có ${config.noun} nào.`}</p>
      )}
      {blocks.map((block, index) => {
        const missing = blockMissingLocales(block, config);
        return (
          <div key={block.key} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  {config.noun.charAt(0).toUpperCase() + config.noun.slice(1)} {index + 1}
                </span>
                {missing.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Thiếu {missing.map((locale) => locale.toUpperCase()).join(", ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Chuyển lên"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Chuyển xuống"
                  disabled={disabled || index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Xoá ${config.noun}`}
                  disabled={disabled}
                  onClick={() => onChange(blocks.filter((item) => item.key !== block.key))}
                  className="rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-40"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <BlockFields
              idPrefix={`${idPrefix}-${block.key}`}
              config={config}
              block={block}
              disabled={disabled}
              onChange={(patch) =>
                onChange(blocks.map((item) => (item.key === block.key ? { ...item, ...patch } : item)))
              }
            />
          </div>
        );
      })}
      <div>
        <ActionButton
          variant="secondary"
          icon={<Plus size={15} />}
          disabled={disabled || blocks.length >= config.max}
          onClick={() => onChange([...blocks, emptyBlock(config)])}
        >
          Thêm {config.noun}
        </ActionButton>
        {blocks.length >= config.max && (
          <span className="ml-3 text-xs text-slate-400">Tối đa {config.max}.</span>
        )}
      </div>
    </div>
  );
}

/** Configs of the blocks a service category (and the overview) is made of. */
export const BLOCK_CONFIGS = {
  stats: {
    noun: "số liệu",
    max: 12,
    icon: true,
    value: true,
    fields: [
      { key: "label", label: "Nhãn", max: 150, required: true },
      { key: "description", label: "Mô tả", max: 300, required: true, multiline: true },
    ],
  },
  products: {
    noun: "sản phẩm",
    max: 30,
    image: "Ảnh sản phẩm",
    duration: true,
    anchor: true,
    tags: true,
    fields: [
      { key: "name", label: "Tên", max: 200, required: true },
      { key: "description", label: "Mô tả", max: 600, required: true, multiline: true },
    ],
  },
  processSteps: {
    noun: "bước quy trình",
    max: 12,
    icon: true,
    fields: [
      { key: "title", label: "Tiêu đề", max: 200, required: true },
      { key: "description", label: "Mô tả", max: 400, required: true, multiline: true },
    ],
  },
  whyUs: {
    noun: "lý do chọn chúng tôi",
    max: 12,
    icon: true,
    fields: [
      { key: "title", label: "Tiêu đề", max: 200, required: true },
      { key: "description", label: "Mô tả", max: 400, required: true, multiline: true },
    ],
  },
  highlights: {
    noun: "điểm nổi bật",
    max: 12,
    icon: true,
    fields: [
      { key: "title", label: "Tiêu đề", max: 200, required: true },
      { key: "description", label: "Mô tả", max: 400, required: true, multiline: true },
    ],
  },
  caseStudies: {
    noun: "case study",
    max: 30,
    image: "Ảnh case study",
    duration: true,
    tags: true,
    fields: [
      { key: "name", label: "Tên", max: 200, required: true },
      { key: "description", label: "Mô tả", max: 600, required: true, multiline: true },
    ],
  },
  testimonials: {
    noun: "nhận xét",
    max: 20,
    authorName: true,
    fields: [
      { key: "quote", label: "Nhận xét", max: 1000, required: true, multiline: true },
      { key: "authorRole", label: "Chức danh", max: 200 },
    ],
  },
  faq: {
    noun: "câu hỏi",
    max: 30,
    fields: [
      { key: "question", label: "Câu hỏi", max: 300, required: true },
      { key: "answer", label: "Trả lời", max: 2000, required: true, multiline: true },
    ],
  },
  partnerBanner: {
    noun: "banner đối tác",
    max: 1,
    image: "Ảnh banner",
    ctaHref: true,
    fields: [
      { key: "label", label: "Nhãn", max: 150, required: true },
      { key: "heading", label: "Tiêu đề", max: 300, required: true },
      { key: "text", label: "Nội dung", max: 1000, required: true, multiline: true },
      { key: "ctaLabel", label: "Chữ trên nút", max: 150, required: true },
    ],
  },
} satisfies Record<string, BlockConfig>;

export type BlockKey = keyof typeof BLOCK_CONFIGS;
