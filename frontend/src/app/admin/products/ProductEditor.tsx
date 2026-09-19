"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, CheckCircle2, Save, Send, Trash2, Undo2 } from "lucide-react";
import {
  LOCALES,
  LocaleTabs,
  MediaMultiPicker,
  MediaPicker,
  PublicationBadge,
  RichTextEditor,
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
  KeyValueEditor,
  MissingTranslationNotice,
  SeoFieldset,
  TagInput,
  contentFieldErrors,
  describeContentError,
  fromLocalInputValue,
  isScheduled,
  isVersionConflict,
  missingTranslationItems,
  slugify,
  toLocalInputValue,
  useLeaveGuard,
  validateSlug,
  type FlatMap,
  type SeoValues,
} from "@/components/admin/content";
import { Field, Input, Panel, Select, Textarea } from "@/components/admin/ui";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  PRODUCT_LIMITS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  productsApi,
  type AdminProductDetail,
  type DemoMode,
  type ProductTranslationInput,
  type ProductType,
} from "@/lib/api/admin/products";
import type { AdminProductCategory } from "@/lib/api/admin/productCategories";
import { PriceEditor, validatePrices, type PriceRow } from "./PriceEditor";
import { productCategoryName } from "./useCategories";

interface LocaleForm extends SeoValues {
  name: string;
  tagline: string;
  descriptionHtml: string;
  features: string[];
}

interface FormState {
  slug: string;
  type: ProductType;
  sku: string;
  categoryId: string;
  cover: MediaSelection | null;
  gallery: MediaSelection[];
  demoUrl: string;
  demoMode: DemoMode;
  techStack: string[];
  specifications: FlatMap;
  priceOnRequest: boolean;
  isFeatured: boolean;
  sortOrder: string;
  publishedAt: string;
  prices: PriceRow[];
  translations: Record<Locale, LocaleForm>;
}

const EMPTY_LOCALE: LocaleForm = {
  name: "",
  tagline: "",
  descriptionHtml: "",
  features: [],
  ...EMPTY_SEO,
};

function toFormState(detail: AdminProductDetail | null): FormState {
  const translations = {} as Record<Locale, LocaleForm>;
  for (const locale of LOCALES) {
    const row = detail?.translations?.[locale];
    translations[locale] = row
      ? {
          name: row.name,
          tagline: row.tagline ?? "",
          descriptionHtml: row.descriptionHtml ?? "",
          features: row.features ?? [],
          seoTitle: row.seoTitle ?? "",
          seoDescription: row.seoDescription ?? "",
          seoKeywords: row.seoKeywords ?? "",
          canonicalUrl: row.canonicalUrl ?? "",
          noIndex: row.noIndex,
          ogImage: row.ogImageId
            ? {
                id: row.ogImageId,
                url: "",
                thumbnailUrl: "",
                name: `Ảnh OG (${locale.toUpperCase()})`,
              }
            : null,
        }
      : { ...EMPTY_LOCALE };
  }
  return {
    slug: detail?.slug ?? "",
    type: detail?.type ?? "source_code",
    sku: detail?.sku ?? "",
    categoryId: detail?.categoryId ?? "",
    cover:
      detail?.coverImageId && detail.coverImageUrl
        ? {
            id: detail.coverImageId,
            url: detail.coverImageUrl,
            thumbnailUrl: detail.coverImageUrl,
            name: "Ảnh bìa",
          }
        : null,
    gallery: (detail?.gallery ?? []).map((item, index) => ({
      id: item.mediaAssetId,
      url: item.url ?? "",
      thumbnailUrl: item.url ?? "",
      name: `Ảnh ${index + 1}`,
    })),
    demoUrl: detail?.demoUrl ?? "",
    demoMode: detail?.demoMode ?? "external",
    techStack: detail?.techStack ?? [],
    specifications: detail?.specifications ?? {},
    priceOnRequest: detail?.priceOnRequest ?? false,
    isFeatured: detail?.isFeatured ?? false,
    sortOrder: String(detail?.sortOrder ?? 0),
    publishedAt: toLocalInputValue(detail?.publishedAt),
    prices: (detail?.prices ?? []).map((price) => ({
      key: price.id,
      currency: price.currency,
      amount: price.amount,
      billingPeriod: price.billingPeriod,
      isDefault: price.isDefault,
    })),
    translations,
  };
}

function toTranslationInput(form: LocaleForm): ProductTranslationInput {
  return {
    name: form.name.trim(),
    tagline: form.tagline.trim() || null,
    descriptionHtml: form.descriptionHtml || null,
    features: form.features,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    seoKeywords: form.seoKeywords.trim() || null,
    canonicalUrl: form.canonicalUrl.trim() || null,
    noIndex: form.noIndex,
    ogImageId: form.ogImage?.id ?? null,
  };
}

function incompleteLocales(form: FormState): Locale[] {
  return LOCALES.filter((locale) => {
    const row = form.translations[locale];
    return !row.name.trim() || !row.tagline.trim() || !row.descriptionHtml.trim();
  });
}

export interface ProductEditorProps {
  initial: AdminProductDetail | null;
  categories: AdminProductCategory[];
  onReload?: () => void;
  reloading?: boolean;
}

export function ProductEditor({
  initial,
  categories,
  onReload,
  reloading = false,
}: ProductEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user, hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });
  const { locale, setLocale } = useLocaleTabs("vi");

  const [detail, setDetail] = useState<AdminProductDetail | null>(initial);
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [dirty, setDirty] = useState(false);
  const [slugTouched, setSlugTouched] = useState(initial !== null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [missing, setMissing] = useState<string | null>(null);

  const isNew = detail === null;
  const status = detail?.status ?? "draft";
  useLeaveGuard(dirty);
  const { leave } = useLeaveGuard(dirty);

  const canPublish = hasPermission(PERMISSIONS.PRODUCT_PUBLISH);
  const canUpdateAny = hasPermission(PERMISSIONS.PRODUCT_UPDATE_ANY);
  const canUpdateOwn = hasPermission(PERMISSIONS.PRODUCT_UPDATE_OWN);
  const canDelete = hasPermission(PERMISSIONS.PRODUCT_DELETE);
  const isOwner = Boolean(detail?.createdById && detail.createdById === user?.id);
  const canEdit = isNew
    ? hasPermission(PERMISSIONS.PRODUCT_CREATE)
    : canUpdateAny || (canUpdateOwn && isOwner && status === "draft");
  const readOnlyReason = canEdit
    ? null
    : !isOwner
      ? "Bạn chỉ có thể chỉnh sửa sản phẩm do chính mình tạo."
      : "Chỉ bản nháp mới được chỉnh sửa với quyền hiện tại của bạn.";

  const update = useCallback((patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setDirty(true);
  }, []);

  const updateLocale = useCallback((target: Locale, patch: Partial<LocaleForm>) => {
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [target]: { ...current.translations[target], ...patch },
      },
    }));
    setDirty(true);
  }, []);

  const missingLocales = useMemo(() => incompleteLocales(form), [form]);
  const slugError = validateSlug(form.slug, PRODUCT_LIMITS.slug);
  const priceError = form.priceOnRequest ? null : validatePrices(form.prices);
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
    if (!form.translations.vi.name.trim()) {
      setLocale("vi");
      setFieldErrors({ "translations.vi.name": "Tên sản phẩm tiếng Việt là bắt buộc." });
      toast.error("Vui lòng nhập tên sản phẩm tiếng Việt.");
      return false;
    }
    if (slugError) {
      setFieldErrors({ slug: slugError });
      toast.error(slugError);
      return false;
    }
    if (priceError) {
      setFieldErrors({ prices: priceError });
      toast.error(priceError);
      return false;
    }
    if (form.priceOnRequest && form.prices.length > 0) {
      toast.error("Đã bật “Giá theo yêu cầu” — hãy xoá các mức giá trước khi lưu.");
      return false;
    }
    if (form.demoUrl.trim() && !/^https:\/\//i.test(form.demoUrl.trim())) {
      setFieldErrors({ demoUrl: "Liên kết demo phải bắt đầu bằng https://" });
      toast.error("Liên kết demo phải dùng https://");
      return false;
    }
    const sortOrder = Number(form.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      toast.error("Thứ tự hiển thị phải là số nguyên.");
      return false;
    }
    return true;
  };

  const commonPayload = () => ({
    slug: form.slug.trim() || undefined,
    type: form.type,
    sku: form.sku.trim() || null,
    categoryId: form.categoryId || null,
    coverImageId: form.cover?.id ?? null,
    galleryImageIds: form.gallery.map((item) => item.id),
    demoUrl: form.demoUrl.trim() || null,
    demoMode: form.demoMode,
    techStack: form.techStack,
    specifications: form.specifications,
    priceOnRequest: form.priceOnRequest,
    isFeatured: form.isFeatured,
    sortOrder: Number(form.sortOrder),
    prices: form.priceOnRequest
      ? []
      : form.prices.map((row) => ({
          currency: row.currency,
          amount: row.amount.trim(),
          billingPeriod: row.billingPeriod,
          isDefault: row.isDefault,
        })),
  });

  const save = async (): Promise<AdminProductDetail | undefined> => {
    clearNotices();
    if (detail === null) {
      const created = await action.run(
        () =>
          productsApi.create({
            ...commonPayload(),
            translations: {
              vi: {
                ...toTranslationInput(form.translations.vi),
                name: form.translations.vi.name.trim(),
              },
              en: toTranslationInput(form.translations.en),
            },
          }),
        { onError: (error) => toast.error(handleError(error)) },
      );
      if (created) {
        setDetail(created);
        setDirty(false);
        toast.success("Đã tạo bản nháp sản phẩm.");
        router.replace(`/admin/products/${created.id}`);
      }
      return created;
    }

    const saved = await action.run(
      () =>
        productsApi.update(detail.id, {
          version: detail.version,
          ...commonPayload(),
          translations: {
            vi: toTranslationInput(form.translations.vi),
            en: toTranslationInput(form.translations.en),
          },
        }),
      { onError: (error) => toast.error(handleError(error)) },
    );
    if (saved) {
      setDetail(saved);
      setForm(toFormState(saved));
      setDirty(false);
      toast.success("Đã lưu sản phẩm.");
    }
    return saved;
  };

  const runWorkflow = async (
    call: (id: string, version: number) => Promise<AdminProductDetail>,
    successMessage: string,
    options: { saveFirst?: boolean } = {},
  ) => {
    if (!validate()) return;
    let current = detail;
    if (options.saveFirst !== false && (dirty || current === null)) {
      const saved = await save();
      if (!saved) return;
      current = saved;
    }
    if (!current) return;
    const target = current;
    clearNotices();
    const result = await action.run(() => call(target.id, target.version), {
      onError: (error) => toast.error(handleError(error)),
    });
    if (result) {
      setDetail(result);
      setForm(toFormState(result));
      setDirty(false);
      toast.success(successMessage);
    }
  };

  const handlePublish = () => {
    const iso = fromLocalInputValue(form.publishedAt);
    const scheduled = isScheduled(form.publishedAt);
    void runWorkflow(
      (id, version) => productsApi.publish(id, { version, publishedAt: iso ?? undefined }),
      scheduled ? "Đã lên lịch xuất bản sản phẩm." : "Đã xuất bản sản phẩm.",
    );
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: "Xoá sản phẩm?",
      message: "Sản phẩm sẽ được chuyển vào thùng rác và không còn hiển thị trên trang bán hàng.",
      confirmLabel: "Xoá sản phẩm",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => productsApi.remove(detail.id), {
      onError: (error) => toast.error(handleError(error)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá sản phẩm.");
      setDirty(false);
      router.push("/admin/products");
    }
  };

  const busy = action.pending;
  const scheduled = isScheduled(form.publishedAt);
  const hostingWarning =
    form.type === "hosting_plan" &&
    !form.priceOnRequest &&
    form.prices.some((row) => row.billingPeriod === "one_time");
  const demoWarning = form.type === "live_demo" && !form.demoUrl.trim();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void leave("/admin/products")}
            aria-label="Quay lại danh sách sản phẩm"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isNew ? "Tạo sản phẩm mới" : "Chỉnh sửa sản phẩm"}
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
            Lưu nháp
          </ActionButton>
          {!isNew && status === "draft" && canUpdateOwn && (
            <ActionButton
              variant="secondary"
              icon={<Send size={15} />}
              pending={busy}
              disabled={!canEdit}
              onClick={() =>
                void runWorkflow(
                  (id, version) => productsApi.submitForReview(id, version),
                  "Đã gửi duyệt sản phẩm.",
                )
              }
            >
              Gửi duyệt
            </ActionButton>
          )}
          {!isNew && canPublish && status !== "published" && (
            <ActionButton
              variant="primary"
              icon={<CheckCircle2 size={15} />}
              pending={busy}
              onClick={handlePublish}
            >
              {scheduled ? "Lên lịch" : "Xuất bản"}
            </ActionButton>
          )}
          {!isNew && canPublish && status !== "draft" && (
            <ActionButton
              variant="secondary"
              icon={<Undo2 size={15} />}
              pending={busy}
              onClick={() =>
                void runWorkflow(
                  (id, version) => productsApi.unpublish(id, version),
                  status === "in_review"
                    ? "Đã trả sản phẩm về bản nháp."
                    : "Đã đưa sản phẩm về bản nháp.",
                  { saveFirst: false },
                )
              }
            >
              {status === "archived"
                ? "Khôi phục"
                : status === "in_review"
                  ? "Từ chối duyệt"
                  : "Gỡ xuất bản"}
            </ActionButton>
          )}
          {!isNew && canPublish && status !== "archived" && (
            <ActionButton
              variant="secondary"
              icon={<Archive size={15} />}
              pending={busy}
              onClick={() =>
                void runWorkflow(
                  (id, version) => productsApi.archive(id, version),
                  "Đã lưu trữ sản phẩm.",
                  { saveFirst: false },
                )
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
      {readOnlyReason && <InfoNotice>{readOnlyReason}</InfoNotice>}
      {hostingWarning && (
        <InfoNotice>
          Gói hosting chỉ được xuất bản khi mọi mức giá là hàng tháng hoặc hàng năm.
        </InfoNotice>
      )}
      {demoWarning && (
        <InfoNotice>Sản phẩm dạng demo trực tiếp cần liên kết demo trước khi xuất bản.</InfoNotice>
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
                    <Field
                      label={`Tên sản phẩm (${suffix})`}
                      htmlFor={`product-name-${current}`}
                      required={current === "vi"}
                    >
                      <Input
                        id={`product-name-${current}`}
                        value={values.name}
                        maxLength={PRODUCT_LIMITS.name}
                        aria-invalid={
                          fieldErrors[`translations.${current}.name`] ? true : undefined
                        }
                        onChange={(event) => {
                          const name = event.target.value;
                          updateLocale(current, { name });
                          if (current === "vi" && !slugTouched) {
                            update({ slug: slugify(name, PRODUCT_LIMITS.slug) });
                          }
                        }}
                      />
                    </Field>
                    <Field label={`Khẩu hiệu (${suffix})`} htmlFor={`product-tagline-${current}`}>
                      <Textarea
                        id={`product-tagline-${current}`}
                        rows={2}
                        value={values.tagline}
                        maxLength={PRODUCT_LIMITS.tagline}
                        onChange={(event) => updateLocale(current, { tagline: event.target.value })}
                      />
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      <span
                        id={`product-desc-label-${current}`}
                        className="text-sm font-medium text-slate-700"
                      >
                        Mô tả chi tiết ({suffix})
                      </span>
                      <RichTextEditor
                        value={values.descriptionHtml}
                        onChange={(html) => updateLocale(current, { descriptionHtml: html })}
                        disabled={!canEdit}
                        mediaFolder="san-pham"
                        aria-labelledby={`product-desc-label-${current}`}
                        placeholder="Mô tả sản phẩm…"
                      />
                    </div>
                    <TagInput
                      label={`Tính năng nổi bật (${suffix})`}
                      value={values.features}
                      onChange={(features) => updateLocale(current, { features })}
                      max={PRODUCT_LIMITS.features}
                      maxLength={PRODUCT_LIMITS.featureLength}
                      placeholder="Nhập tính năng rồi nhấn Enter"
                      disabled={!canEdit}
                    />
                    <details className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700">
                        Tối ưu SEO ({suffix})
                      </summary>
                      <div className="mt-4">
                        <SeoFieldset
                          idPrefix={`product-${current}`}
                          value={values}
                          onChange={(patch) => updateLocale(current, patch)}
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

          <Panel title="Thông số & công nghệ">
            <fieldset disabled={!canEdit} className="flex flex-col gap-4">
              <TagInput
                label="Công nghệ sử dụng"
                value={form.techStack}
                onChange={(techStack) => update({ techStack })}
                max={PRODUCT_LIMITS.techStack}
                maxLength={PRODUCT_LIMITS.techLength}
                disabled={!canEdit}
              />
              <KeyValueEditor
                value={form.specifications}
                onChange={(specifications) => update({ specifications })}
                disabled={!canEdit}
                hint="Ví dụ: CPU, RAM, dung lượng, băng thông."
                error={fieldErrors.specifications}
              />
            </fieldset>
          </Panel>

          <Panel title="Bảng giá">
            <fieldset disabled={!canEdit} className="flex flex-col gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.priceOnRequest}
                  onChange={(event) =>
                    update({
                      priceOnRequest: event.target.checked,
                      prices: event.target.checked ? [] : form.prices,
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                Giá theo yêu cầu (không hiển thị bảng giá)
              </label>
              <PriceEditor
                value={form.prices}
                onChange={(prices) => update({ prices })}
                disabled={!canEdit || form.priceOnRequest}
                error={priceError ?? fieldErrors.prices}
                lockedHint={
                  form.priceOnRequest
                    ? "Sản phẩm đang ở chế độ giá theo yêu cầu."
                    : "Chưa có mức giá nào. Cần ít nhất một mức giá để xuất bản."
                }
              />
            </fieldset>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Thông tin chung">
            <fieldset disabled={!canEdit} className="flex flex-col gap-4">
              <Field label="Loại sản phẩm" htmlFor="product-type" required>
                <Select
                  id="product-type"
                  value={form.type}
                  onChange={(event) => update({ type: event.target.value as ProductType })}
                >
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PRODUCT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Đường dẫn (slug)"
                htmlFor="product-slug"
                hint={
                  fieldErrors.slug ??
                  slugError ??
                  (slugChangedOnPublished
                    ? "Đổi đường dẫn của sản phẩm đã xuất bản sẽ làm hỏng liên kết cũ."
                    : "Tự động tạo từ tên tiếng Việt.")
                }
              >
                <Input
                  id="product-slug"
                  value={form.slug}
                  maxLength={PRODUCT_LIMITS.slug}
                  aria-invalid={slugError || fieldErrors.slug ? true : undefined}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update({ slug: event.target.value });
                  }}
                />
              </Field>
              <Field label="Mã SKU" htmlFor="product-sku" hint={fieldErrors.sku}>
                <Input
                  id="product-sku"
                  value={form.sku}
                  maxLength={PRODUCT_LIMITS.sku}
                  onChange={(event) => update({ sku: event.target.value })}
                />
              </Field>
              <Field
                label="Danh mục"
                htmlFor="product-category"
                hint={fieldErrors.categoryId}
              >
                <Select
                  id="product-category"
                  value={form.categoryId}
                  onChange={(event) => update({ categoryId: event.target.value })}
                >
                  <option value="">Không có danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {productCategoryName(category)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Link
                href="/admin/products/categories"
                className="text-xs font-medium text-accent hover:underline"
              >
                Quản lý danh mục sản phẩm
              </Link>
              <Field label="Thứ tự hiển thị" htmlFor="product-sort">
                <Input
                  id="product-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => update({ sortOrder: event.target.value })}
                />
              </Field>
              <Field
                label="Thời điểm xuất bản"
                htmlFor="product-published-at"
                hint={
                  canPublish
                    ? "Để trống để xuất bản ngay; chọn thời điểm tương lai để lên lịch."
                    : "Chỉ người có quyền xuất bản mới đặt được thời điểm này."
                }
              >
                <Input
                  id="product-published-at"
                  type="datetime-local"
                  value={form.publishedAt}
                  disabled={!canPublish}
                  onChange={(event) => update({ publishedAt: event.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) => update({ isFeatured: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                Sản phẩm nổi bật
              </label>
            </fieldset>
          </Panel>

          <Panel title="Bản demo">
            <fieldset disabled={!canEdit} className="flex flex-col gap-4">
              <Field
                label="Liên kết demo"
                htmlFor="product-demo-url"
                hint={fieldErrors.demoUrl ?? "Bắt buộc dùng https://"}
              >
                <Input
                  id="product-demo-url"
                  type="url"
                  placeholder="https://demo.khaifrost.com"
                  value={form.demoUrl}
                  maxLength={PRODUCT_LIMITS.demoUrl}
                  aria-invalid={fieldErrors.demoUrl ? true : undefined}
                  onChange={(event) => update({ demoUrl: event.target.value })}
                />
              </Field>
              <Field label="Cách mở demo" htmlFor="product-demo-mode">
                <Select
                  id="product-demo-mode"
                  value={form.demoMode}
                  onChange={(event) => update({ demoMode: event.target.value as DemoMode })}
                >
                  <option value="external">Mở ở tab mới</option>
                  <option value="embed">Nhúng trong trang</option>
                </Select>
              </Field>
            </fieldset>
          </Panel>

          <Panel title="Hình ảnh">
            <div className="flex flex-col gap-4">
              <MediaPicker
                label="Ảnh bìa"
                value={form.cover}
                onChange={(cover) => update({ cover })}
                disabled={!canEdit}
                folder="san-pham"
                error={fieldErrors.coverImageId}
              />
              <MediaMultiPicker
                label="Thư viện ảnh"
                value={form.gallery}
                onChange={(gallery) => update({ gallery })}
                max={PRODUCT_LIMITS.gallery}
                disabled={!canEdit}
                folder="san-pham"
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
