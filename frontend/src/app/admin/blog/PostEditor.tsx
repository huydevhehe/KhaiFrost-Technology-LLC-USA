"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
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
import { RichTextEditor } from "@/components/admin/shared";
import {
  ActionButton,
  ConflictNotice,
  EMPTY_SEO,
  InfoNotice,
  MissingTranslationNotice,
  SeoFieldset,
  TagInput,
  contentFieldErrors,
  describeContentError,
  missingTranslationItems,
  fromLocalInputValue,
  isScheduled,
  isVersionConflict,
  slugify,
  toLocalInputValue,
  useLeaveGuard,
  validateSlug,
  type SeoValues,
} from "@/components/admin/content";
import { Field, Input, Panel, Select } from "@/components/admin/ui";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import {
  POST_LIMITS,
  postsApi,
  type AdminPostDetail,
  type PostTranslationInput,
  type PostTranslationsInput,
} from "@/lib/api/admin/posts";
import type { AdminPostCategory } from "@/lib/api/admin/postCategories";
import { CategoryQuickCreate } from "./CategoryQuickCreate";

interface LocaleForm extends SeoValues {
  title: string;
  excerpt: string;
  contentHtml: string;
  tags: string[];
}

interface FormState {
  slug: string;
  categoryId: string;
  cover: MediaSelection | null;
  isFeatured: boolean;
  authorName: string;
  publishedAt: string;
  translations: Record<Locale, LocaleForm>;
}

const EMPTY_LOCALE: LocaleForm = {
  title: "",
  excerpt: "",
  contentHtml: "",
  tags: [],
  ...EMPTY_SEO,
};

function toSelection(
  media: { id: string; url: string; thumbnailUrl: string } | null | undefined,
  name: string,
): MediaSelection | null {
  if (!media) return null;
  return { id: media.id, url: media.url, thumbnailUrl: media.thumbnailUrl, name };
}

function toFormState(detail: AdminPostDetail | null): FormState {
  const translations = {} as Record<Locale, LocaleForm>;
  for (const locale of LOCALES) {
    const row = detail?.translations?.[locale] ?? null;
    translations[locale] = row
      ? {
          title: row.title,
          excerpt: row.excerpt,
          contentHtml: row.contentHtml,
          tags: row.tags ?? [],
          seoTitle: row.seoTitle ?? "",
          seoDescription: row.seoDescription ?? "",
          seoKeywords: row.seoKeywords ?? "",
          canonicalUrl: row.canonicalUrl ?? "",
          noIndex: row.noIndex,
          ogImage: toSelection(row.ogImage, `Ảnh OG (${locale.toUpperCase()})`),
        }
      : { ...EMPTY_LOCALE };
  }
  return {
    slug: detail?.slug ?? "",
    categoryId: detail?.category?.id ?? "",
    cover: toSelection(detail?.coverImage, "Ảnh bìa"),
    isFeatured: detail?.isFeatured ?? false,
    authorName: detail?.authorName ?? "",
    publishedAt: toLocalInputValue(detail?.publishedAt),
    translations,
  };
}

function toTranslationInput(form: LocaleForm): PostTranslationInput {
  return {
    title: form.title,
    excerpt: form.excerpt,
    contentHtml: form.contentHtml,
    tags: form.tags,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    seoKeywords: form.seoKeywords.trim() || null,
    canonicalUrl: form.canonicalUrl.trim() || null,
    noIndex: form.noIndex,
    ogImageId: form.ogImage?.id ?? null,
  };
}

function allTranslations(form: FormState): PostTranslationsInput {
  const payload: PostTranslationsInput = {};
  for (const locale of LOCALES) payload[locale] = toTranslationInput(form.translations[locale]);
  return payload;
}

/** Locales whose title / excerpt / content is still empty. */
function incompleteLocales(form: FormState): Locale[] {
  return LOCALES.filter((locale) => {
    const row = form.translations[locale];
    return !row.title.trim() || !row.excerpt.trim() || !row.contentHtml.trim();
  });
}

export interface PostEditorProps {
  /** null while creating a new article. */
  initial: AdminPostDetail | null;
  categories: AdminPostCategory[];
  onCategoriesChanged: () => void;
  /** Reloads the article from the server (after a version conflict). */
  onReload?: () => void;
  reloading?: boolean;
}

export function PostEditor({
  initial,
  categories,
  onCategoriesChanged,
  onReload,
  reloading = false,
}: PostEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user, hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });
  const { locale, setLocale } = useLocaleTabs("vi");

  const [detail, setDetail] = useState<AdminPostDetail | null>(initial);
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(initial !== null);

  const isNew = detail === null;
  const status = detail?.status ?? "draft";
  const { leave } = useLeaveGuard(dirty);

  const canPublish = hasPermission(PERMISSIONS.POST_PUBLISH);
  const canUpdateAny = hasPermission(PERMISSIONS.POST_UPDATE_ANY);
  const canUpdateOwn = hasPermission(PERMISSIONS.POST_UPDATE_OWN);
  const canDelete = hasPermission(PERMISSIONS.POST_DELETE);
  const isOwner = Boolean(detail?.createdById && detail.createdById === user?.id);
  const editableStatus = status === "draft" || status === "in_review";
  const canEdit = isNew
    ? hasPermission(PERMISSIONS.POST_CREATE)
    : canUpdateAny || (canUpdateOwn && isOwner && editableStatus);
  const readOnlyReason = canEdit
    ? null
    : !isOwner
      ? "Bạn chỉ có thể chỉnh sửa bài viết do chính mình tạo."
      : "Bài viết đã xuất bản hoặc lưu trữ chỉ có thể được chỉnh sửa bởi người có quyền sửa mọi bài viết.";

  const update = useCallback((patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
    setDirty(true);
  }, []);

  const updateLocale = useCallback(
    (target: Locale, patch: Partial<LocaleForm>) => {
      setForm((current) => ({
        ...current,
        translations: {
          ...current.translations,
          [target]: { ...current.translations[target], ...patch },
        },
      }));
      setDirty(true);
    },
    [],
  );

  const missingLocales = useMemo(() => incompleteLocales(form), [form]);
  const slugError = validateSlug(form.slug, POST_LIMITS.slug);
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
    if (!form.translations.vi.title.trim() && !form.translations.en.title.trim()) {
      setFieldErrors({ "translations.vi.title": "Cần ít nhất một tiêu đề." });
      setLocale("vi");
      toast.error("Vui lòng nhập tiêu đề trước khi lưu.");
      return false;
    }
    if (slugError) {
      setFieldErrors({ slug: slugError });
      toast.error(slugError);
      return false;
    }
    return true;
  };

  /** Creates or updates the article and returns the saved detail. */
  const save = async (): Promise<AdminPostDetail | undefined> => {
    clearNotices();
    const payloadTranslations = allTranslations(form);
    if (detail === null) {
      const created = await action.run(
        () =>
          postsApi.create({
            slug: form.slug.trim() || undefined,
            translations: payloadTranslations,
            categoryId: form.categoryId || null,
            coverImageId: form.cover?.id ?? null,
            isFeatured: form.isFeatured,
            authorName: form.authorName.trim() || undefined,
          }),
        { onError: (error) => toast.error(handleError(error)) },
      );
      if (created) {
        setDetail(created);
        setDirty(false);
        toast.success("Đã tạo bản nháp.");
        router.replace(`/admin/blog/${created.id}`);
      }
      return created;
    }

    const publishedAtIso = fromLocalInputValue(form.publishedAt);
    const saved = await action.run(
      () =>
        postsApi.update(detail.id, {
          version: detail.version,
          slug: form.slug.trim() || undefined,
          translations: payloadTranslations,
          categoryId: form.categoryId || null,
          coverImageId: form.cover?.id ?? null,
          isFeatured: form.isFeatured,
          authorName: form.authorName.trim() || undefined,
          ...(canPublish && publishedAtIso && publishedAtIso !== detail.publishedAt
            ? { publishedAt: publishedAtIso }
            : {}),
        }),
      { onError: (error) => toast.error(handleError(error)) },
    );
    if (saved) {
      setDetail(saved);
      setForm(toFormState(saved));
      setDirty(false);
      toast.success("Đã lưu bài viết.");
    }
    return saved;
  };

  const runWorkflow = async (
    call: (id: string) => Promise<AdminPostDetail>,
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
    const result = await action.run(() => call(target.id), {
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
      (id) => postsApi.publish(id, iso ?? undefined),
      scheduled ? "Đã lên lịch xuất bản." : "Đã xuất bản bài viết.",
    );
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: "Xoá bài viết?",
      message: "Bài viết sẽ được chuyển vào thùng rác và không còn hiển thị trên trang công khai.",
      confirmLabel: "Xoá bài viết",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => postsApi.remove(detail.id), {
      onError: (error) => toast.error(handleError(error)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá bài viết.");
      setDirty(false);
      router.push("/admin/blog");
    }
  };

  const busy = action.pending;
  const scheduled = isScheduled(form.publishedAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void leave("/admin/blog")}
            aria-label="Quay lại danh sách bài viết"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isNew ? "Tạo bài viết mới" : "Chỉnh sửa bài viết"}
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
              onClick={() => void runWorkflow(postsApi.submitForReview, "Đã gửi duyệt.")}
            >
              Gửi duyệt
            </ActionButton>
          )}
          {!isNew && canPublish && (status === "draft" || status === "in_review") && (
            <ActionButton
              variant="primary"
              icon={<CheckCircle2 size={15} />}
              pending={busy}
              onClick={handlePublish}
            >
              {scheduled ? "Lên lịch" : "Xuất bản"}
            </ActionButton>
          )}
          {!isNew && canPublish && status === "in_review" && (
            <ActionButton
              variant="secondary"
              icon={<Undo2 size={15} />}
              pending={busy}
              onClick={() =>
                void runWorkflow(postsApi.reject, "Đã trả bài về bản nháp.", { saveFirst: false })
              }
            >
              Từ chối duyệt
            </ActionButton>
          )}
          {!isNew && canPublish && status === "published" && (
            <ActionButton
              variant="secondary"
              icon={<Undo2 size={15} />}
              pending={busy}
              onClick={() =>
                void runWorkflow(postsApi.unpublish, "Đã gỡ xuất bản.", { saveFirst: false })
              }
            >
              Gỡ xuất bản
            </ActionButton>
          )}
          {!isNew && canPublish && status !== "archived" && (
            <ActionButton
              variant="secondary"
              icon={<Archive size={15} />}
              pending={busy}
              onClick={() =>
                void runWorkflow(postsApi.archive, "Đã lưu trữ bài viết.", { saveFirst: false })
              }
            >
              Lưu trữ
            </ActionButton>
          )}
          {!isNew && canPublish && status === "archived" && (
            <ActionButton
              variant="secondary"
              icon={<RotateCcw size={15} />}
              pending={busy}
              onClick={() =>
                void runWorkflow(postsApi.restore, "Đã khôi phục về bản nháp.", {
                  saveFirst: false,
                })
              }
            >
              Khôi phục
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
                    <Field label={`Tiêu đề (${suffix})`} htmlFor={`title-${current}`} required>
                      <Input
                        id={`title-${current}`}
                        value={values.title}
                        maxLength={POST_LIMITS.title}
                        aria-invalid={
                          fieldErrors[`translations.${current}.title`] ? true : undefined
                        }
                        onChange={(event) => {
                          const title = event.target.value;
                          updateLocale(current, { title });
                          if (current === "vi" && !slugTouched) {
                            update({ slug: slugify(title, POST_LIMITS.slug) });
                          }
                        }}
                      />
                    </Field>
                    <Field
                      label={`Mô tả ngắn (${suffix})`}
                      htmlFor={`excerpt-${current}`}
                      hint="Tối đa 600 ký tự. Bỏ trống sẽ lấy tự động từ nội dung."
                    >
                      <textarea
                        id={`excerpt-${current}`}
                        rows={3}
                        value={values.excerpt}
                        maxLength={POST_LIMITS.excerpt}
                        onChange={(event) => updateLocale(current, { excerpt: event.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      <span id={`content-label-${current}`} className="text-sm font-medium text-slate-700">
                        Nội dung ({suffix}) <span className="text-red-500">*</span>
                      </span>
                      <RichTextEditor
                        value={values.contentHtml}
                        onChange={(html) => updateLocale(current, { contentHtml: html })}
                        disabled={!canEdit}
                        mediaFolder="bai-viet"
                        aria-labelledby={`content-label-${current}`}
                        placeholder="Viết nội dung bài viết…"
                      />
                    </div>
                    <TagInput
                      label={`Thẻ (${suffix})`}
                      value={values.tags}
                      onChange={(tags) => updateLocale(current, { tags })}
                      max={POST_LIMITS.tags}
                      maxLength={POST_LIMITS.tagLength}
                      disabled={!canEdit}
                    />
                    <details className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700">
                        Tối ưu SEO ({suffix})
                      </summary>
                      <div className="mt-4">
                        <SeoFieldset
                          idPrefix={`post-${current}`}
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
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Xuất bản">
            <fieldset disabled={!canEdit} className="flex flex-col gap-4">
              <Field
                label="Đường dẫn (slug)"
                htmlFor="post-slug"
                hint={
                  fieldErrors.slug ??
                  slugError ??
                  (slugChangedOnPublished
                    ? "Đổi đường dẫn của bài đã xuất bản sẽ làm hỏng các liên kết cũ."
                    : "Tự động tạo từ tiêu đề tiếng Việt, có thể sửa.")
                }
              >
                <Input
                  id="post-slug"
                  value={form.slug}
                  maxLength={POST_LIMITS.slug}
                  aria-invalid={slugError || fieldErrors.slug ? true : undefined}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update({ slug: event.target.value });
                  }}
                />
              </Field>
              {slugChangedOnPublished && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Bài viết đang được xuất bản. Đổi đường dẫn sẽ khiến các liên kết đã chia sẻ không
                  còn hoạt động.
                </p>
              )}
              <Field
                label="Thời điểm xuất bản"
                htmlFor="post-published-at"
                hint={
                  canPublish
                    ? "Để trống để xuất bản ngay. Chọn thời điểm trong tương lai để lên lịch."
                    : "Chỉ người có quyền xuất bản mới đổi được thời điểm này."
                }
              >
                <Input
                  id="post-published-at"
                  type="datetime-local"
                  value={form.publishedAt}
                  disabled={!canPublish}
                  onChange={(event) => update({ publishedAt: event.target.value })}
                />
              </Field>
              <Field label="Tác giả hiển thị" htmlFor="post-author">
                <Input
                  id="post-author"
                  value={form.authorName}
                  maxLength={POST_LIMITS.authorName}
                  placeholder="KhaiFrost"
                  onChange={(event) => update({ authorName: event.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) => update({ isFeatured: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                Bài viết nổi bật
              </label>
            </fieldset>
          </Panel>

          <Panel
            title="Danh mục"
            action={
              <Link
                href="/admin/blog/categories"
                className="text-xs font-medium text-accent hover:underline"
              >
                Quản lý
              </Link>
            }
          >
            <fieldset disabled={!canEdit} className="flex flex-col gap-3">
              <Select
                aria-label="Danh mục bài viết"
                value={form.categoryId}
                onChange={(event) => update({ categoryId: event.target.value })}
              >
                <option value="">Không có danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.vi?.name ?? category.en?.name ?? category.slug}
                  </option>
                ))}
              </Select>
              {fieldErrors.categoryId && (
                <p role="alert" className="text-xs text-red-600">
                  {fieldErrors.categoryId}
                </p>
              )}
              <ActionButton variant="secondary" onClick={() => setCategoryOpen(true)}>
                Tạo danh mục nhanh
              </ActionButton>
            </fieldset>
          </Panel>

          <Panel title="Ảnh bìa">
            <MediaPicker
              label={null}
              value={form.cover}
              onChange={(selection) => update({ cover: selection })}
              disabled={!canEdit}
              folder="bai-viet"
              error={fieldErrors.coverImageId}
            />
          </Panel>
        </div>
      </div>

      {categoryOpen && (
        <CategoryQuickCreate
          onClose={() => setCategoryOpen(false)}
          onCreated={(category) => {
            setCategoryOpen(false);
            onCategoriesChanged();
            update({ categoryId: category.id });
          }}
        />
      )}
    </div>
  );
}

