"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, CheckCircle2, Save, Trash2, Undo2 } from "lucide-react";
import {
  LOCALES,
  LocaleTabs,
  MediaPicker,
  PublicationBadge,
  TranslatedFields,
  toIncompleteMap,
  useApiAction,
  useConfirm,
  useLocaleTabs,
  useToast,
  type Locale,
  type MediaSelection,
} from "@/components/admin/shared";
import {
  ActionButton,
  ConflictNotice,
  EMPTY_SEO,
  InfoNotice,
  MissingTranslationNotice,
  SeoFieldset,
  contentFieldErrors,
  describeContentError,
  isVersionConflict,
  missingTranslationItems,
  slugify,
  useLeaveGuard,
  validateSlug,
  type SeoValues,
} from "@/components/admin/content";
import { Field, Input, Panel, Select } from "@/components/admin/ui";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  RESERVED_SERVICE_SLUGS,
  SERVICE_ICON_KEYS,
  SERVICE_ICON_LABELS,
  SERVICE_REQUIRED_TEXT_FIELDS,
  SERVICE_TEXT_LIMITS,
  serviceCatalogApi,
  type ServiceCategoryContentInput,
  type ServiceCategoryDetail,
  type ServiceCategoryTranslationInput,
  type ServiceIconKey,
} from "@/lib/api/admin/serviceCatalog";
import {
  BLOCK_CONFIGS,
  BlockFields,
  BlockListEditor,
  blockFromServer,
  blockMissingLocales,
  blockProblem,
  blockToInput,
  emptyBlock,
  type BlockForm,
  type BlockKey,
} from "./blocks";

type ListBlockKey = Exclude<BlockKey, "partnerBanner" | "highlights">;

const LIST_BLOCKS: { key: ListBlockKey; title: string; hint: string }[] = [
  { key: "stats", title: "Số liệu nổi bật", hint: "Các con số thể hiện năng lực của dịch vụ." },
  { key: "products", title: "Sản phẩm / giải pháp", hint: "Danh sách sản phẩm thuộc dịch vụ này." },
  { key: "processSteps", title: "Quy trình triển khai", hint: "Các bước làm việc với khách hàng." },
  { key: "whyUs", title: "Vì sao chọn chúng tôi", hint: "Các lý do khách hàng nên chọn dịch vụ." },
  { key: "caseStudies", title: "Case study", hint: "Các dự án tiêu biểu." },
  { key: "testimonials", title: "Nhận xét khách hàng", hint: "Nhận xét hiển thị trên trang dịch vụ." },
  { key: "faq", title: "Câu hỏi thường gặp", hint: "Câu hỏi và trả lời." },
];

const TEXT_FIELDS: {
  key: Exclude<keyof ServiceCategoryTranslationInput, "noIndex" | "ogImageId" | keyof SeoValues>;
  label: string;
  max: number;
  multiline?: boolean;
  required?: boolean;
  hint?: string;
}[] = [
  { key: "title", label: "Tên dịch vụ", max: SERVICE_TEXT_LIMITS.title, required: true },
  {
    key: "categoryName",
    label: "Tên danh mục hiển thị",
    max: SERVICE_TEXT_LIMITS.categoryName,
    required: true,
  },
  {
    key: "summary",
    label: "Mô tả ngắn",
    max: SERVICE_TEXT_LIMITS.summary,
    required: true,
    multiline: true,
  },
  { key: "heroTitle", label: "Tiêu đề đầu trang", max: SERVICE_TEXT_LIMITS.heroTitle, required: true },
  {
    key: "heroSubtitle",
    label: "Phụ đề đầu trang",
    max: SERVICE_TEXT_LIMITS.heroSubtitle,
    required: true,
    multiline: true,
  },
  { key: "productsEyebrow", label: "Nhãn phần sản phẩm", max: SERVICE_TEXT_LIMITS.productsEyebrow },
  { key: "productsHeading", label: "Tiêu đề phần sản phẩm", max: SERVICE_TEXT_LIMITS.productsHeading },
  {
    key: "productsIntro",
    label: "Giới thiệu phần sản phẩm",
    max: SERVICE_TEXT_LIMITS.productsIntro,
    multiline: true,
  },
];

type TextKey = (typeof TEXT_FIELDS)[number]["key"];

interface LocaleForm extends SeoValues {
  texts: Record<TextKey, string>;
}

interface FormState {
  slug: string;
  iconKey: ServiceIconKey;
  sortOrder: string;
  cover: MediaSelection | null;
  hero: MediaSelection | null;
  translations: Record<Locale, LocaleForm>;
  blocks: Record<ListBlockKey, BlockForm[]>;
  banner: BlockForm | null;
}

function toSelection(
  id: string | null | undefined,
  url: string | null | undefined,
  name: string,
): MediaSelection | null {
  return id && url ? { id, url, thumbnailUrl: url, name } : null;
}

function emptyLocale(): LocaleForm {
  return {
    ...EMPTY_SEO,
    texts: Object.fromEntries(TEXT_FIELDS.map((field) => [field.key, ""])) as Record<TextKey, string>,
  };
}

function toFormState(detail: ServiceCategoryDetail | null): FormState {
  const translations = {} as Record<Locale, LocaleForm>;
  for (const locale of LOCALES) {
    const row = detail?.translations[locale];
    const form = emptyLocale();
    if (row) {
      for (const field of TEXT_FIELDS) form.texts[field.key] = row[field.key] ?? "";
      form.seoTitle = row.seoTitle ?? "";
      form.seoDescription = row.seoDescription ?? "";
      form.seoKeywords = row.seoKeywords ?? "";
      form.canonicalUrl = row.canonicalUrl ?? "";
      form.noIndex = row.noIndex;
      form.ogImage = toSelection(row.ogImageId, row.ogImageUrl, `Ảnh OG (${locale.toUpperCase()})`);
    }
    translations[locale] = form;
  }
  const blocks = {} as Record<ListBlockKey, BlockForm[]>;
  for (const { key } of LIST_BLOCKS) {
    blocks[key] = (detail?.[key] ?? []).map((raw) => blockFromServer(raw, BLOCK_CONFIGS[key]));
  }
  return {
    slug: detail?.slug ?? "",
    iconKey: (detail?.iconKey as ServiceIconKey | undefined) ?? SERVICE_ICON_KEYS[0],
    sortOrder: String(detail?.sortOrder ?? 0),
    cover: toSelection(detail?.coverImageId, detail?.coverImageUrl, "Ảnh thẻ"),
    hero: toSelection(detail?.heroImageId, detail?.heroImageUrl, "Ảnh đầu trang"),
    translations,
    blocks,
    banner: detail?.partnerBanner
      ? blockFromServer(detail.partnerBanner, BLOCK_CONFIGS.partnerBanner)
      : null,
  };
}

function toTranslationInput(form: LocaleForm): ServiceCategoryTranslationInput {
  const input: ServiceCategoryTranslationInput = {
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    seoKeywords: form.seoKeywords.trim() || null,
    canonicalUrl: form.canonicalUrl.trim() || null,
    noIndex: form.noIndex,
    ogImageId: form.ogImage?.id ?? null,
  };
  for (const field of TEXT_FIELDS) input[field.key] = form.texts[field.key].trim() || null;
  return input;
}

function incompleteLocales(form: FormState): Locale[] {
  return LOCALES.filter((locale) =>
    SERVICE_REQUIRED_TEXT_FIELDS.some((key) => !form.translations[locale].texts[key].trim()),
  );
}

/** Locales in which some block still lacks a required text. */
function blockIncompleteLocales(form: FormState): Locale[] {
  const found = new Set<Locale>();
  for (const { key } of LIST_BLOCKS) {
    for (const block of form.blocks[key]) {
      for (const locale of blockMissingLocales(block, BLOCK_CONFIGS[key])) found.add(locale);
    }
  }
  if (form.banner) {
    for (const locale of blockMissingLocales(form.banner, BLOCK_CONFIGS.partnerBanner)) {
      found.add(locale);
    }
  }
  return [...found];
}

function Collapsible({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count?: number;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4">
        <span className="text-sm font-semibold text-slate-900">
          {title}
          {count !== undefined && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {count}
            </span>
          )}
        </span>
        {hint && <span className="hidden text-xs text-slate-400 sm:block">{hint}</span>}
      </summary>
      <div className="border-t border-slate-100 p-5">{children}</div>
    </details>
  );
}

export interface ServiceEditorProps {
  /** null while creating a new service. */
  initial: ServiceCategoryDetail | null;
  onReload?: () => void;
  reloading?: boolean;
}

export function ServiceEditor({ initial, onReload, reloading = false }: ServiceEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });
  const { locale, setLocale } = useLocaleTabs("vi");

  const [detail, setDetail] = useState<ServiceCategoryDetail | null>(initial);
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(initial !== null);

  const isNew = detail === null;
  const status = detail?.status ?? "draft";
  const { leave } = useLeaveGuard(dirty);

  const canEdit = hasPermission(isNew ? PERMISSIONS.SERVICE_CREATE : PERMISSIONS.SERVICE_UPDATE);
  const canPublish = hasPermission(PERMISSIONS.SERVICE_PUBLISH);
  const canDelete = hasPermission(PERMISSIONS.SERVICE_DELETE);

  const update = useCallback((patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setDirty(true);
  }, []);

  const updateText = (target: Locale, key: TextKey, value: string) => {
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [target]: {
          ...current.translations[target],
          texts: { ...current.translations[target].texts, [key]: value },
        },
      },
    }));
    setDirty(true);
  };

  const updateSeo = (target: Locale, patch: Partial<SeoValues>) => {
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [target]: { ...current.translations[target], ...patch },
      },
    }));
    setDirty(true);
  };

  const missingLocales = useMemo(() => incompleteLocales(form), [form]);
  const blockMissing = useMemo(() => blockIncompleteLocales(form), [form]);
  const slugError =
    validateSlug(form.slug, 200) ??
    (RESERVED_SERVICE_SLUGS.includes(form.slug.trim()) ? "Đường dẫn này đã được hệ thống sử dụng." : null);
  const sortOrderNumber = Number(form.sortOrder);
  const sortOrderError =
    !Number.isInteger(sortOrderNumber) || sortOrderNumber < 0 || sortOrderNumber > 100000
      ? "Thứ tự phải là số nguyên từ 0 đến 100000."
      : null;
  const slugChangedOnPublished =
    status === "published" && !isNew && form.slug !== (detail?.slug ?? "");

  const clearNotices = () => {
    setFieldErrors({});
    setConflict(null);
    setMissing(null);
  };

  const handleError = useCallback((error: unknown) => {
    const message = describeContentError(error);
    setFieldErrors(contentFieldErrors(error));
    setConflict(isVersionConflict(error) ? message : null);
    setMissing(missingTranslationItems(error).length > 0 ? message : null);
    return message;
  }, []);

  const validate = (): boolean => {
    if (!form.translations.vi.texts.title.trim()) {
      setLocale("vi");
      toast.error("Vui lòng nhập tên dịch vụ tiếng Việt trước khi lưu.");
      return false;
    }
    const problem = slugError ?? sortOrderError;
    if (problem) {
      toast.error(problem);
      return false;
    }
    for (const { key, title } of LIST_BLOCKS) {
      for (const [index, block] of form.blocks[key].entries()) {
        const blockIssue = blockProblem(block, BLOCK_CONFIGS[key]);
        if (blockIssue) {
          toast.error(`${title}, mục ${index + 1}: ${blockIssue}`);
          return false;
        }
      }
    }
    if (form.banner) {
      const bannerIssue = blockProblem(form.banner, BLOCK_CONFIGS.partnerBanner);
      if (bannerIssue) {
        toast.error(`Banner đối tác: ${bannerIssue}`);
        return false;
      }
    }
    return true;
  };

  const buildPayload = (): ServiceCategoryContentInput => {
    const translations: ServiceCategoryContentInput["translations"] = {};
    for (const code of LOCALES) translations[code] = toTranslationInput(form.translations[code]);
    const payload: Record<string, unknown> = {
      slug: form.slug.trim() || undefined,
      sortOrder: sortOrderNumber,
      coverImageId: form.cover?.id ?? null,
      heroImageId: form.hero?.id ?? null,
      translations,
      partnerBanner: form.banner ? blockToInput(form.banner, BLOCK_CONFIGS.partnerBanner) : null,
    };
    for (const { key } of LIST_BLOCKS) {
      payload[key] = form.blocks[key].map((block) => blockToInput(block, BLOCK_CONFIGS[key]));
    }
    return payload as ServiceCategoryContentInput;
  };

  const applyDetail = (saved: ServiceCategoryDetail) => {
    setDetail(saved);
    setForm(toFormState(saved));
    setDirty(false);
  };

  const save = async (): Promise<ServiceCategoryDetail | undefined> => {
    clearNotices();
    const payload = buildPayload();
    if (detail === null) {
      const created = await action.run(
        () => serviceCatalogApi.create({ ...payload, iconKey: form.iconKey }),
        { onError: (error) => toast.error(handleError(error)) },
      );
      if (created) {
        setDetail(created);
        setDirty(false);
        toast.success("Đã tạo bản nháp dịch vụ.");
        router.replace(`/admin/services/${created.id}`);
      }
      return created;
    }
    const saved = await action.run(
      () =>
        serviceCatalogApi.update(detail.id, {
          ...payload,
          iconKey: form.iconKey,
          version: detail.version,
        }),
      { onError: (error) => toast.error(handleError(error)) },
    );
    if (saved) {
      applyDetail(saved);
      toast.success("Đã lưu dịch vụ.");
    }
    return saved;
  };

  const runWorkflow = async (
    call: (id: string) => Promise<ServiceCategoryDetail>,
    successMessage: string,
    options: { saveFirst?: boolean } = {},
  ) => {
    const saveFirst = options.saveFirst !== false;
    if (saveFirst && !validate()) return;
    let current = detail;
    if (saveFirst && (dirty || current === null)) {
      const saved = await save();
      if (!saved) return;
      current = saved;
    }
    if (!current) return;
    const target = current;
    clearNotices();
    const result = await action.run(() => call(target.id), {
      onError: (error) => toast.error(handleError(error)),
    });
    if (result) {
      applyDetail(result);
      toast.success(successMessage);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: "Xoá dịch vụ?",
      message: "Dịch vụ sẽ không còn hiển thị trên trang công khai.",
      confirmLabel: "Xoá dịch vụ",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => serviceCatalogApi.remove(detail.id), {
      onError: (error) => toast.error(handleError(error)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá dịch vụ.");
      setDirty(false);
      router.push("/admin/services");
    }
  };

  const busy = action.pending;
  const textareaClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";
  const allIncomplete = [...new Set([...missingLocales, ...blockMissing])];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void leave("/admin/services")}
            aria-label="Quay lại danh sách dịch vụ"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isNew ? "Tạo dịch vụ mới" : "Chỉnh sửa dịch vụ"}
            </h1>
            {detail && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <PublicationBadge status={detail.status} publishedAt={detail.publishedAt} />
                <span className="text-xs text-slate-400">Phiên bản {detail.version}</span>
                {dirty && <span className="text-xs text-amber-600">Có thay đổi chưa lưu</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            variant="secondary"
            icon={<Save size={15} />}
            pending={busy}
            disabled={!canEdit}
            onClick={() => {
              if (validate()) void save();
            }}
          >
            {isNew ? "Tạo bản nháp" : "Lưu"}
          </ActionButton>
          {!isNew && canPublish && (status === "draft" || status === "in_review") && (
            <ActionButton
              variant="primary"
              icon={<CheckCircle2 size={15} />}
              pending={busy}
              onClick={() => void runWorkflow(serviceCatalogApi.publish, "Đã xuất bản dịch vụ.")}
            >
              Xuất bản
            </ActionButton>
          )}
          {!isNew && canPublish && (status === "published" || status === "archived") && (
            <ActionButton
              variant="secondary"
              icon={<Undo2 size={15} />}
              pending={busy}
              onClick={() =>
                void runWorkflow(serviceCatalogApi.unpublish, "Đã chuyển về bản nháp.", {
                  saveFirst: false,
                })
              }
            >
              {status === "published" ? "Gỡ xuất bản" : "Khôi phục"}
            </ActionButton>
          )}
          {!isNew && canPublish && status === "published" && (
            <ActionButton
              variant="secondary"
              icon={<Archive size={15} />}
              pending={busy}
              onClick={() =>
                void runWorkflow(serviceCatalogApi.archive, "Đã lưu trữ dịch vụ.", {
                  saveFirst: false,
                })
              }
            >
              Lưu trữ
            </ActionButton>
          )}
          {!isNew && canDelete && (
            <ActionButton
              variant="danger"
              icon={<Trash2 size={15} />}
              pending={busy}
              onClick={() => void handleDelete()}
            >
              Xoá
            </ActionButton>
          )}
        </div>
      </div>

      {conflict && onReload && (
        <ConflictNotice message={conflict} onReload={onReload} reloading={reloading} />
      )}
      {missing && <MissingTranslationNotice message={missing} />}
      {!canEdit && <InfoNotice>Bạn không có quyền chỉnh sửa dịch vụ này.</InfoNotice>}
      {canEdit && allIncomplete.length > 0 && (
        <InfoNotice>
          Cần đủ nội dung bắt buộc (dấu *) của trang và của mọi khối cho cả tiếng Việt và tiếng Anh
          mới xuất bản được. Còn thiếu:{" "}
          {allIncomplete.map((code) => code.toUpperCase()).join(", ")}.
        </InfoNotice>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Panel>
            <LocaleTabs
              value={locale}
              onChange={setLocale}
              incomplete={toIncompleteMap(missingLocales)}
              className="mb-4"
            />
            {LOCALES.map((current) => {
              const values = form.translations[current];
              const suffix = current.toUpperCase();
              return (
                <TranslatedFields key={current} locale={current} active={locale}>
                  <fieldset disabled={!canEdit} className="flex flex-col gap-4">
                    {TEXT_FIELDS.map((field) => {
                      const id = `service-${field.key}-${current}`;
                      return (
                        <Field
                          key={field.key}
                          label={`${field.label} (${suffix})`}
                          htmlFor={id}
                          required={field.required}
                          hint={fieldErrors[`translations.${current}.${field.key}`]}
                        >
                          {field.multiline ? (
                            <textarea
                              id={id}
                              rows={3}
                              value={values.texts[field.key]}
                              maxLength={field.max}
                              onChange={(event) => updateText(current, field.key, event.target.value)}
                              className={textareaClass}
                            />
                          ) : (
                            <Input
                              id={id}
                              value={values.texts[field.key]}
                              maxLength={field.max}
                              onChange={(event) => {
                                const text = event.target.value;
                                updateText(current, field.key, text);
                                if (field.key === "title" && current === "vi" && !slugTouched) {
                                  update({ slug: slugify(text, 200) });
                                }
                              }}
                            />
                          )}
                        </Field>
                      );
                    })}
                    <details className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700">
                        Tối ưu SEO ({suffix})
                      </summary>
                      <div className="mt-4">
                        <SeoFieldset
                          idPrefix={`service-${current}`}
                          value={values}
                          onChange={(patch) => updateSeo(current, patch)}
                          disabled={!canEdit}
                          errors={fieldErrors}
                          errorPrefix={`translations.${current}`}
                        />
                      </div>
                    </details>
                  </fieldset>
                </TranslatedFields>
              );
            })}
          </Panel>

          {LIST_BLOCKS.map(({ key, title, hint }) => (
            <Collapsible key={key} title={title} count={form.blocks[key].length} hint={hint}>
              <BlockListEditor
                idPrefix={`service-${key}`}
                config={BLOCK_CONFIGS[key]}
                blocks={form.blocks[key]}
                disabled={!canEdit}
                onChange={(blocks) => update({ blocks: { ...form.blocks, [key]: blocks } })}
              />
            </Collapsible>
          ))}

          <Collapsible
            title="Banner đối tác"
            count={form.banner ? 1 : 0}
            hint="Khối kêu gọi hành động cuối trang."
          >
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.banner !== null}
                  disabled={!canEdit}
                  onChange={(event) =>
                    update({ banner: event.target.checked ? emptyBlock(BLOCK_CONFIGS.partnerBanner) : null })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                Hiển thị banner đối tác
              </label>
              {form.banner && (
                <BlockFields
                  idPrefix="service-banner"
                  config={BLOCK_CONFIGS.partnerBanner}
                  block={form.banner}
                  disabled={!canEdit}
                  onChange={(patch) => update({ banner: { ...form.banner!, ...patch } })}
                />
              )}
            </div>
          </Collapsible>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Thông tin chung">
            <fieldset disabled={!canEdit} className="flex flex-col gap-4">
              <Field
                label="Đường dẫn (slug)"
                htmlFor="service-slug"
                hint={
                  fieldErrors.slug ?? slugError ?? "Tự động tạo từ tên tiếng Việt, có thể sửa."
                }
              >
                <Input
                  id="service-slug"
                  value={form.slug}
                  maxLength={200}
                  aria-invalid={slugError || fieldErrors.slug ? true : undefined}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update({ slug: event.target.value });
                  }}
                />
              </Field>
              {slugChangedOnPublished && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Dịch vụ đang được xuất bản. Đổi đường dẫn sẽ khiến các liên kết đã chia sẻ không
                  còn hoạt động.
                </p>
              )}
              <Field label="Biểu tượng" htmlFor="service-icon">
                <Select
                  id="service-icon"
                  value={form.iconKey}
                  onChange={(event) => update({ iconKey: event.target.value as ServiceIconKey })}
                >
                  {SERVICE_ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {SERVICE_ICON_LABELS[key]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Thứ tự hiển thị"
                htmlFor="service-sort"
                hint={sortOrderError ?? "Số nhỏ hiển thị trước."}
              >
                <Input
                  id="service-sort"
                  type="number"
                  min={0}
                  max={100000}
                  value={form.sortOrder}
                  onChange={(event) => update({ sortOrder: event.target.value })}
                />
              </Field>
            </fieldset>
          </Panel>

          <Panel title="Ảnh thẻ dịch vụ">
            <MediaPicker
              label={null}
              value={form.cover}
              onChange={(selection) => update({ cover: selection })}
              disabled={!canEdit}
              folder="dich-vu"
              error={fieldErrors.coverImageId}
            />
          </Panel>

          <Panel title="Ảnh đầu trang">
            <MediaPicker
              label={null}
              value={form.hero}
              onChange={(selection) => update({ hero: selection })}
              disabled={!canEdit}
              folder="dich-vu"
              error={fieldErrors.heroImageId}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
