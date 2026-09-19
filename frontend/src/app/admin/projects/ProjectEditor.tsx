"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Plus,
  Save,
  Send,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
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
  MissingTranslationNotice,
  SeoFieldset,
  TagInput,
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
  PROJECT_DURATION_PATTERN,
  PROJECT_LIMITS,
  projectsApi,
  type ProjectContentInput,
  type ProjectDetail,
  type ProjectTranslationInput,
} from "@/lib/api/admin/projects";
import type { ProjectCategory } from "@/lib/api/admin/projectCategories";
import { projectCategoryName } from "./useCategories";

interface LocaleForm extends SeoValues {
  title: string;
  summary: string;
  descriptionHtml: string;
  industry: string;
}

interface SectionLocale {
  heading: string;
  bodyHtml: string;
}

interface SectionForm {
  key: string;
  translations: Record<Locale, SectionLocale>;
}

interface FormState {
  slug: string;
  categoryId: string;
  thumbnail: MediaSelection | null;
  gallery: MediaSelection[];
  clientName: string;
  technologies: string[];
  demoUrl: string;
  videoUrl: string;
  hasVideo: boolean;
  videoDuration: string;
  completedAt: string;
  featured: boolean;
  sortOrder: string;
  translations: Record<Locale, LocaleForm>;
  sections: SectionForm[];
}

const EMPTY_LOCALE: LocaleForm = {
  title: "",
  summary: "",
  descriptionHtml: "",
  industry: "",
  ...EMPTY_SEO,
};

function toSelection(
  url: string | null | undefined,
  id: string | null | undefined,
  name: string,
): MediaSelection | null {
  if (!url || !id) return null;
  return { id, url, thumbnailUrl: url, name };
}

function newSectionKey(): string {
  return `section-${crypto.randomUUID()}`;
}

function toFormState(detail: ProjectDetail | null): FormState {
  const translations = {} as Record<Locale, LocaleForm>;
  for (const locale of LOCALES) {
    const row = detail?.translations?.[locale] ?? null;
    translations[locale] = row
      ? {
          title: row.title,
          summary: row.summary,
          descriptionHtml: row.descriptionHtml,
          industry: row.industry ?? "",
          seoTitle: row.seoTitle ?? "",
          seoDescription: row.seoDescription ?? "",
          seoKeywords: row.seoKeywords ?? "",
          canonicalUrl: row.canonicalUrl ?? "",
          noIndex: row.noIndex,
          ogImage: toSelection(row.ogImageUrl, row.ogImageId, `Ảnh OG (${locale.toUpperCase()})`),
        }
      : { ...EMPTY_LOCALE };
  }
  return {
    slug: detail?.slug ?? "",
    categoryId: detail?.categoryId ?? "",
    thumbnail: toSelection(detail?.thumbnailUrl, detail?.thumbnailId, "Ảnh đại diện"),
    gallery: (detail?.gallery ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .flatMap((item, index) => {
        const selection = toSelection(item.url, item.mediaAssetId, `Ảnh ${index + 1}`);
        return selection ? [selection] : [];
      }),
    clientName: detail?.clientName ?? "",
    technologies: detail?.technologies ?? [],
    demoUrl: detail?.demoUrl ?? "",
    videoUrl: detail?.videoUrl ?? "",
    hasVideo: detail?.hasVideo ?? false,
    videoDuration: detail?.videoDuration ?? "",
    completedAt: detail?.completedAt ?? "",
    featured: detail?.featured ?? false,
    sortOrder: String(detail?.sortOrder ?? 0),
    translations,
    sections: (detail?.sections ?? []).map((section) => ({
      key: newSectionKey(),
      translations: {
        vi: {
          heading: section.translations.vi?.heading ?? "",
          bodyHtml: section.translations.vi?.bodyHtml ?? "",
        },
        en: {
          heading: section.translations.en?.heading ?? "",
          bodyHtml: section.translations.en?.bodyHtml ?? "",
        },
      },
    })),
  };
}

function toTranslationInput(form: LocaleForm): ProjectTranslationInput {
  return {
    title: form.title.trim(),
    summary: form.summary.trim(),
    descriptionHtml: form.descriptionHtml,
    industry: form.industry.trim() || null,
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    seoKeywords: form.seoKeywords.trim() || null,
    canonicalUrl: form.canonicalUrl.trim() || null,
    noIndex: form.noIndex,
    ogImageId: form.ogImage?.id ?? null,
  };
}

/** Locales whose title or summary is still empty (both are needed to publish). */
function incompleteLocales(form: FormState): Locale[] {
  return LOCALES.filter((locale) => {
    const row = form.translations[locale];
    return !row.title.trim() || !row.summary.trim();
  });
}

export interface ProjectEditorProps {
  /** null while creating a new project. */
  initial: ProjectDetail | null;
  categories: ProjectCategory[];
  /** Reloads the project from the server (after a version conflict). */
  onReload?: () => void;
  reloading?: boolean;
}

export function ProjectEditor({
  initial,
  categories,
  onReload,
  reloading = false,
}: ProjectEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user, hasPermission } = useAuth();
  const action = useApiAction({ showErrorToast: false });
  const { locale, setLocale } = useLocaleTabs("vi");

  const [detail, setDetail] = useState<ProjectDetail | null>(initial);
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [dirty, setDirty] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState<string | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(initial !== null);

  const isNew = detail === null;
  const status = detail?.status ?? "draft";
  const { leave } = useLeaveGuard(dirty);

  const canPublish = hasPermission(PERMISSIONS.PROJECT_PUBLISH);
  const canUpdateAny = hasPermission(PERMISSIONS.PROJECT_UPDATE_ANY);
  const canUpdateOwn = hasPermission(PERMISSIONS.PROJECT_UPDATE_OWN);
  const canDelete = hasPermission(PERMISSIONS.PROJECT_DELETE);
  const isOwner = Boolean(detail?.createdById && detail.createdById === user?.id);
  const canEdit = isNew
    ? hasPermission(PERMISSIONS.PROJECT_CREATE)
    : canUpdateAny || (canUpdateOwn && isOwner && status === "draft");
  const readOnlyReason = canEdit
    ? null
    : !isOwner
      ? "Bạn chỉ có thể chỉnh sửa dự án do chính mình tạo."
      : "Chỉ bản nháp mới chỉnh sửa được với quyền hiện tại; dự án đang chờ duyệt hoặc đã xuất bản cần quyền sửa mọi dự án.";

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

  const updateSection = useCallback(
    (key: string, target: Locale, patch: Partial<SectionLocale>) => {
      setForm((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.key === key
            ? {
                ...section,
                translations: {
                  ...section.translations,
                  [target]: { ...section.translations[target], ...patch },
                },
              }
            : section,
        ),
      }));
      setDirty(true);
    },
    [],
  );

  const addSection = () => {
    if (form.sections.length >= PROJECT_LIMITS.sections) return;
    update({
      sections: [
        ...form.sections,
        {
          key: newSectionKey(),
          translations: {
            vi: { heading: "", bodyHtml: "" },
            en: { heading: "", bodyHtml: "" },
          },
        },
      ],
    });
  };

  const moveSection = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= form.sections.length) return;
    const next = form.sections.slice();
    [next[index], next[target]] = [next[target], next[index]];
    update({ sections: next });
  };

  const removeSection = (key: string) => {
    update({ sections: form.sections.filter((section) => section.key !== key) });
  };

  const missingLocales = useMemo(() => incompleteLocales(form), [form]);
  const slugError = validateSlug(form.slug, PROJECT_LIMITS.slug);
  const slugChangedOnPublished =
    status === "published" && !isNew && form.slug !== (detail?.slug ?? "");
  const durationError =
    form.videoDuration.trim() && !PROJECT_DURATION_PATTERN.test(form.videoDuration.trim())
      ? "Định dạng thời lượng là mm:ss, ví dụ 02:32."
      : null;
  const sortOrderNumber = Number(form.sortOrder);
  const sortOrderError =
    !Number.isInteger(sortOrderNumber) || sortOrderNumber < 0 || sortOrderNumber > 100000
      ? "Thứ tự phải là số nguyên từ 0 đến 100000."
      : null;

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
    if (!form.translations.vi.title.trim()) {
      setFieldErrors({ "translations.vi.title": "Cần tên dự án tiếng Việt." });
      setLocale("vi");
      toast.error("Vui lòng nhập tên dự án tiếng Việt trước khi lưu.");
      return false;
    }
    const problem = slugError ?? durationError ?? (canUpdateAny ? sortOrderError : null);
    if (problem) {
      toast.error(problem);
      return false;
    }
    return true;
  };

  const buildPayload = (): ProjectContentInput => {
    const translations: ProjectContentInput["translations"] = {};
    for (const code of LOCALES) translations[code] = toTranslationInput(form.translations[code]);
    return {
      slug: form.slug.trim() || undefined,
      categoryId: form.categoryId || null,
      thumbnailId: form.thumbnail?.id ?? null,
      galleryMediaIds: form.gallery.map((item) => item.id),
      clientName: form.clientName.trim() || null,
      technologies: form.technologies,
      demoUrl: form.demoUrl.trim() || null,
      videoUrl: form.videoUrl.trim() || null,
      hasVideo: form.hasVideo,
      videoDuration: form.videoDuration.trim() || null,
      completedAt: form.completedAt || null,
      translations,
      sections: form.sections.map((section) => ({
        translations: {
          vi: {
            heading: section.translations.vi.heading.trim(),
            bodyHtml: section.translations.vi.bodyHtml,
          },
          en: {
            heading: section.translations.en.heading.trim(),
            bodyHtml: section.translations.en.bodyHtml,
          },
        },
      })),
      ...(canUpdateAny ? { featured: form.featured, sortOrder: sortOrderNumber } : {}),
    };
  };

  const applyDetail = (saved: ProjectDetail) => {
    setDetail(saved);
    setForm(toFormState(saved));
    setDirty(false);
  };

  /** Creates or updates the project and returns the saved detail. */
  const save = async (): Promise<ProjectDetail | undefined> => {
    clearNotices();
    const payload = buildPayload();
    if (detail === null) {
      const created = await action.run(() => projectsApi.create(payload), {
        onError: (error) => toast.error(handleError(error)),
      });
      if (created) {
        setDetail(created);
        setDirty(false);
        toast.success("Đã tạo bản nháp dự án.");
        router.replace(`/admin/projects/${created.id}`);
      }
      return created;
    }
    const saved = await action.run(
      () => projectsApi.update(detail.id, { ...payload, version: detail.version }),
      { onError: (error) => toast.error(handleError(error)) },
    );
    if (saved) {
      applyDetail(saved);
      toast.success("Đã lưu dự án.");
    }
    return saved;
  };

  const runWorkflow = async (
    call: (id: string) => Promise<ProjectDetail>,
    successMessage: string,
    options: { saveFirst?: boolean } = {},
  ) => {
    if (options.saveFirst !== false && !validate()) return;
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
      applyDetail(result);
      toast.success(successMessage);
    }
  };

  const handleDelete = async () => {
    if (!detail) return;
    const ok = await confirm({
      title: "Xoá dự án?",
      message: "Dự án sẽ không còn hiển thị trên trang công khai.",
      confirmLabel: "Xoá dự án",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => projectsApi.remove(detail.id), {
      onError: (error) => toast.error(handleError(error)),
    });
    if (done !== undefined) {
      toast.success("Đã xoá dự án.");
      setDirty(false);
      router.push("/admin/projects");
    }
  };

  const busy = action.pending;
  const textareaClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void leave("/admin/projects")}
            aria-label="Quay lại danh sách dự án"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isNew ? "Tạo dự án mới" : "Chỉnh sửa dự án"}
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
          {!isNew && status === "draft" && canUpdateOwn && (
            <ActionButton
              variant="secondary"
              icon={<Send size={15} />}
              pending={busy}
              disabled={!canEdit}
              onClick={() => void runWorkflow(projectsApi.submitForReview, "Đã gửi duyệt.")}
            >
              Gửi duyệt
            </ActionButton>
          )}
          {!isNew && canPublish && status === "in_review" && (
            <ActionButton
              variant="secondary"
              icon={<Undo2 size={15} />}
              pending={busy}
              onClick={() =>
                void runWorkflow(projectsApi.reject, "Đã trả về bản nháp.", { saveFirst: false })
              }
            >
              Từ chối
            </ActionButton>
          )}
          {!isNew && canPublish && (status === "draft" || status === "in_review") && (
            <ActionButton
              variant="primary"
              icon={<CheckCircle2 size={15} />}
              pending={busy}
              onClick={() => void runWorkflow(projectsApi.publish, "Đã xuất bản dự án.")}
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
                void runWorkflow(projectsApi.unpublish, "Đã chuyển về bản nháp.", {
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
                void runWorkflow(projectsApi.archive, "Đã lưu trữ dự án.", { saveFirst: false })
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
      {canEdit && missingLocales.length > 0 && (
        <InfoNotice>
          Cần đủ tên và mô tả ngắn cho cả tiếng Việt và tiếng Anh mới xuất bản được. Còn thiếu:{" "}
          {missingLocales.map((code) => code.toUpperCase()).join(", ")}.
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
                    <Field label={`Tên dự án (${suffix})`} htmlFor={`project-title-${current}`} required>
                      <Input
                        id={`project-title-${current}`}
                        value={values.title}
                        maxLength={PROJECT_LIMITS.title}
                        aria-invalid={
                          fieldErrors[`translations.${current}.title`] ? true : undefined
                        }
                        onChange={(event) => {
                          const title = event.target.value;
                          updateLocale(current, { title });
                          if (current === "vi" && !slugTouched) {
                            update({ slug: slugify(title, PROJECT_LIMITS.slug) });
                          }
                        }}
                      />
                    </Field>
                    <Field
                      label={`Mô tả ngắn (${suffix})`}
                      htmlFor={`project-summary-${current}`}
                      required
                      hint={`Tối đa ${PROJECT_LIMITS.summary} ký tự, hiển thị trên thẻ dự án.`}
                    >
                      <textarea
                        id={`project-summary-${current}`}
                        rows={3}
                        value={values.summary}
                        maxLength={PROJECT_LIMITS.summary}
                        onChange={(event) => updateLocale(current, { summary: event.target.value })}
                        className={textareaClass}
                      />
                    </Field>
                    <Field label={`Lĩnh vực (${suffix})`} htmlFor={`project-industry-${current}`}>
                      <Input
                        id={`project-industry-${current}`}
                        value={values.industry}
                        maxLength={PROJECT_LIMITS.industry}
                        onChange={(event) => updateLocale(current, { industry: event.target.value })}
                      />
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      <span
                        id={`project-desc-label-${current}`}
                        className="text-sm font-medium text-slate-700"
                      >
                        Nội dung chi tiết ({suffix})
                      </span>
                      <RichTextEditor
                        value={values.descriptionHtml}
                        onChange={(html) => updateLocale(current, { descriptionHtml: html })}
                        disabled={!canEdit}
                        mediaFolder="du-an"
                        aria-labelledby={`project-desc-label-${current}`}
                        placeholder="Mô tả chi tiết dự án…"
                      />
                    </div>
                    <details className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700">
                        Tối ưu SEO ({suffix})
                      </summary>
                      <div className="mt-4">
                        <SeoFieldset
                          idPrefix={`project-${current}`}
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

          <Panel
            title="Các phần nội dung"
            action={
              <ActionButton
                variant="secondary"
                icon={<Plus size={15} />}
                disabled={!canEdit || form.sections.length >= PROJECT_LIMITS.sections}
                onClick={addSection}
              >
                Thêm phần
              </ActionButton>
            }
          >
            {form.sections.length === 0 ? (
              <p className="text-sm text-slate-500">
                Chưa có phần nội dung nào. Mỗi phần gồm tiêu đề và nội dung song ngữ (ví dụ: Thách
                thức, Giải pháp, Kết quả).
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {form.sections.map((section, index) => {
                  const values = section.translations[locale];
                  const suffix = locale.toUpperCase();
                  return (
                    <div
                      key={section.key}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          Phần {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Chuyển phần lên"
                            disabled={!canEdit || index === 0}
                            onClick={() => moveSection(index, -1)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Chuyển phần xuống"
                            disabled={!canEdit || index === form.sections.length - 1}
                            onClick={() => moveSection(index, 1)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                          >
                            <ArrowDown size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Xoá phần"
                            disabled={!canEdit}
                            onClick={() => removeSection(section.key)}
                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-40"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                      <fieldset disabled={!canEdit} className="flex flex-col gap-3">
                        <Field
                          label={`Tiêu đề phần (${suffix})`}
                          htmlFor={`section-heading-${section.key}-${locale}`}
                          hint="Đang hiển thị theo tab ngôn ngữ phía trên."
                        >
                          <Input
                            id={`section-heading-${section.key}-${locale}`}
                            value={values.heading}
                            maxLength={PROJECT_LIMITS.sectionHeading}
                            onChange={(event) =>
                              updateSection(section.key, locale, { heading: event.target.value })
                            }
                          />
                        </Field>
                        <div className="flex flex-col gap-1.5">
                          <span
                            id={`section-body-label-${section.key}-${locale}`}
                            className="text-sm font-medium text-slate-700"
                          >
                            Nội dung phần ({suffix})
                          </span>
                          <RichTextEditor
                            key={`${section.key}-${locale}`}
                            value={values.bodyHtml}
                            onChange={(html) =>
                              updateSection(section.key, locale, { bodyHtml: html })
                            }
                            disabled={!canEdit}
                            mediaFolder="du-an"
                            aria-labelledby={`section-body-label-${section.key}-${locale}`}
                            placeholder="Nội dung của phần này…"
                          />
                        </div>
                      </fieldset>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Thông tin chung">
            <fieldset disabled={!canEdit} className="flex flex-col gap-4">
              <Field
                label="Đường dẫn (slug)"
                htmlFor="project-slug"
                hint={
                  fieldErrors.slug ??
                  slugError ??
                  "Tự động tạo từ tên tiếng Việt, có thể sửa."
                }
              >
                <Input
                  id="project-slug"
                  value={form.slug}
                  maxLength={PROJECT_LIMITS.slug}
                  aria-invalid={slugError || fieldErrors.slug ? true : undefined}
                  onChange={(event) => {
                    setSlugTouched(true);
                    update({ slug: event.target.value });
                  }}
                />
              </Field>
              {slugChangedOnPublished && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Dự án đang được xuất bản. Đổi đường dẫn sẽ khiến các liên kết đã chia sẻ không còn
                  hoạt động.
                </p>
              )}
              <Field label="Danh mục" htmlFor="project-category" hint={fieldErrors.categoryId}>
                <Select
                  id="project-category"
                  value={form.categoryId}
                  onChange={(event) => update({ categoryId: event.target.value })}
                >
                  <option value="">Không có danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {projectCategoryName(category)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Link
                href="/admin/projects/categories"
                className="-mt-2 text-xs font-medium text-accent hover:underline"
              >
                Quản lý danh mục
              </Link>
              <Field label="Khách hàng" htmlFor="project-client">
                <Input
                  id="project-client"
                  value={form.clientName}
                  maxLength={PROJECT_LIMITS.clientName}
                  onChange={(event) => update({ clientName: event.target.value })}
                />
              </Field>
              <Field label="Ngày hoàn thành" htmlFor="project-completed">
                <Input
                  id="project-completed"
                  type="date"
                  value={form.completedAt}
                  onChange={(event) => update({ completedAt: event.target.value })}
                />
              </Field>
              <TagInput
                label="Công nghệ"
                value={form.technologies}
                onChange={(technologies) => update({ technologies })}
                max={PROJECT_LIMITS.technologies}
                maxLength={PROJECT_LIMITS.technologyLength}
                disabled={!canEdit}
                error={fieldErrors.technologies}
              />
              <Field
                label="Liên kết demo"
                htmlFor="project-demo"
                hint={fieldErrors.demoUrl ?? "Địa chỉ http(s) hoặc đường dẫn nội bộ như /lien-he."}
              >
                <Input
                  id="project-demo"
                  value={form.demoUrl}
                  maxLength={PROJECT_LIMITS.demoUrl}
                  onChange={(event) => update({ demoUrl: event.target.value })}
                />
              </Field>
            </fieldset>
          </Panel>

          <Panel title="Video giới thiệu">
            <fieldset disabled={!canEdit} className="flex flex-col gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.hasVideo}
                  onChange={(event) => update({ hasVideo: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                Dự án có video
              </label>
              <Field label="Liên kết video" htmlFor="project-video" hint={fieldErrors.videoUrl}>
                <Input
                  id="project-video"
                  type="url"
                  placeholder="https://"
                  value={form.videoUrl}
                  maxLength={PROJECT_LIMITS.videoUrl}
                  onChange={(event) => update({ videoUrl: event.target.value })}
                />
              </Field>
              <Field
                label="Thời lượng"
                htmlFor="project-duration"
                hint={durationError ?? fieldErrors.videoDuration ?? "Định dạng mm:ss, ví dụ 02:32."}
              >
                <Input
                  id="project-duration"
                  placeholder="02:32"
                  value={form.videoDuration}
                  maxLength={10}
                  aria-invalid={durationError ? true : undefined}
                  onChange={(event) => update({ videoDuration: event.target.value })}
                />
              </Field>
            </fieldset>
          </Panel>

          <Panel title="Hiển thị">
            <fieldset disabled={!canEdit || !canUpdateAny} className="flex flex-col gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) => update({ featured: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/30"
                />
                Dự án nổi bật
              </label>
              <Field
                label="Thứ tự hiển thị"
                htmlFor="project-sort"
                hint={
                  canUpdateAny
                    ? (sortOrderError ?? "Số nhỏ hiển thị trước.")
                    : "Chỉ người có quyền sửa mọi dự án mới đổi được mục này."
                }
              >
                <Input
                  id="project-sort"
                  type="number"
                  min={0}
                  max={100000}
                  value={form.sortOrder}
                  onChange={(event) => update({ sortOrder: event.target.value })}
                />
              </Field>
            </fieldset>
          </Panel>

          <Panel title="Ảnh đại diện">
            <MediaPicker
              label={null}
              value={form.thumbnail}
              onChange={(selection) => update({ thumbnail: selection })}
              disabled={!canEdit}
              folder="du-an"
              error={fieldErrors.thumbnailId}
            />
          </Panel>

          <Panel title="Thư viện ảnh">
            <MediaMultiPicker
              label={null}
              value={form.gallery}
              onChange={(gallery) => update({ gallery })}
              max={PROJECT_LIMITS.gallery}
              disabled={!canEdit}
              folder="du-an"
              error={fieldErrors.galleryMediaIds}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
