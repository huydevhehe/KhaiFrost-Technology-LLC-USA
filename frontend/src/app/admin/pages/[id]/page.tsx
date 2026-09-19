"use client";

import { use, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  History,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Panel } from "@/components/admin/ui";
import {
  ErrorState,
  LOCALE_SHORT_LABELS,
  LocaleTabs,
  TableSkeleton,
  formatDateTime,
  useApiAction,
  useApiResource,
  useConfirm,
  useLocaleTabs,
  type Locale,
} from "@/components/admin/shared";
import {
  ActionButton,
  AddSectionDialog,
  Chip,
  PageRevisionsDialog,
  PagePreviewDialog,
  PageSeoForm,
  SectionForm,
  cleanContent,
  contentEquals,
  findPublishGaps,
  normalizeContent,
  toTranslationInput,
  useUnsavedGuard,
  validateContent,
  type ContentErrors,
} from "@/components/admin/builder";
import { isApiError } from "@/lib/api/client";
import {
  pagesApi,
  type PageDetail,
  type PageSection,
  type PageTranslationInput,
  type SectionContent,
  type SectionTypeDefinition,
} from "@/lib/api/admin/pages";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

interface PublishIssue {
  field: string;
  message: string;
  locale?: Locale;
}

function issuesFromError(error: unknown): PublishIssue[] {
  if (!isApiError(error)) return [];
  if (error.code === "VALIDATION_FAILED") {
    return error.fieldErrors.map((detail) => ({
      field: detail.field,
      message: "Còn thiếu nội dung bắt buộc.",
    }));
  }
  if (error.code === "TRANSLATION_MISSING" && Array.isArray(error.details)) {
    return (error.details as { locale?: string; field?: string }[])
      .filter((item) => typeof item.field === "string")
      .map((item) => ({
        field: item.field as string,
        locale: item.locale === "en" ? "en" : "vi",
        message: "Thiếu bản dịch.",
      }));
  }
  return [];
}

export default function PageEditorRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PageEditor pageId={id} />;
}

function PageEditor({ pageId }: { pageId: string }) {
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission(PERMISSIONS.PAGE_UPDATE);
  const canPublish = hasPermission(PERMISSIONS.PAGE_PUBLISH);

  const page = useApiResource<PageDetail>(`/admin/pages/${pageId}`);
  const registry = useApiResource<SectionTypeDefinition[]>("/admin/pages/section-types");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ sectionId: string; content: SectionContent } | null>(null);
  const [sectionErrors, setSectionErrors] = useState<ContentErrors>({});
  const [seoDraft, setSeoDraft] = useState<Partial<Record<Locale, PageTranslationInput>> | null>(null);
  const [seoErrors, setSeoErrors] = useState<Record<string, string>>({});
  const [publishIssues, setPublishIssues] = useState<PublishIssue[]>([]);
  const [conflict, setConflict] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  const sectionLocale = useLocaleTabs("vi");
  const seoLocale = useLocaleTabs("vi");

  const detail = page.data;
  const sections = useMemo(() => detail?.sections ?? [], [detail]);
  const selected = useMemo(
    () => sections.find((section) => section.id === selectedId) ?? sections[0] ?? null,
    [sections, selectedId],
  );

  const definitionOf = useCallback(
    (type: string): SectionTypeDefinition | undefined =>
      detail?.sectionTypes?.[type] ?? registry.data?.find((item) => item.type === type),
    [detail, registry.data],
  );

  const baseContent = useMemo(
    () => normalizeContent(selected?.draftContent ?? null),
    [selected],
  );
  const activeContent =
    draft && selected && draft.sectionId === selected.id ? draft.content : baseContent;
  const sectionDirty = Boolean(
    draft && selected && draft.sectionId === selected.id && !contentEquals(draft.content, baseContent),
  );

  const baseTranslations = useMemo<Partial<Record<Locale, PageTranslationInput>>>(
    () => ({
      vi: toTranslationInput(detail?.translations?.vi),
      en: toTranslationInput(detail?.translations?.en),
    }),
    [detail],
  );
  const translations = seoDraft ?? baseTranslations;
  const seoDirty = Boolean(seoDraft) && JSON.stringify(seoDraft) !== JSON.stringify(baseTranslations);

  useUnsavedGuard(sectionDirty || seoDirty);

  const saveSection = useApiAction();
  const structureAction = useApiAction();
  const seoAction = useApiAction();
  const publishAction = useApiAction();

  const noteConflict = useCallback((error: unknown) => {
    if (isApiError(error) && error.code === "VERSION_CONFLICT") setConflict(true);
  }, []);

  const reload = useCallback(() => {
    setDraft(null);
    setSeoDraft(null);
    setSectionErrors({});
    setSeoErrors({});
    setConflict(false);
    page.refetch();
  }, [page]);

  const applyDetail = useCallback(
    (next: PageDetail) => {
      page.setData(next);
      setDraft(null);
      setSeoDraft(null);
      setConflict(false);
    },
    [page],
  );

  const confirmDiscardDraftEdits = useCallback(async () => {
    if (!sectionDirty) return true;
    return confirm({
      title: "Bỏ thay đổi chưa lưu?",
      message: "Bạn đang sửa một section nhưng chưa bấm “Lưu nháp”. Thay đổi sẽ bị mất.",
      confirmLabel: "Bỏ thay đổi",
      danger: true,
    });
  }, [confirm, sectionDirty]);

  // ---- section actions --------------------------------------------------

  const handleSelect = useCallback(
    async (section: PageSection) => {
      if (section.id === selected?.id) return;
      if (!(await confirmDiscardDraftEdits())) return;
      setDraft(null);
      setSectionErrors({});
      setSelectedId(section.id);
    },
    [confirmDiscardDraftEdits, selected],
  );

  const handleSaveDraft = useCallback(async () => {
    if (!selected || !detail) return;
    const definition = definitionOf(selected.type);
    if (!definition) return;
    const errors = validateContent(definition, activeContent);
    setSectionErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const saved = await saveSection.run(
      async () => {
        await pagesApi.updateSection(detail.id, selected.id, {
          version: selected.version,
          content: cleanContent(definition, activeContent),
        });
        return pagesApi.get(detail.id);
      },
      {
        successMessage: "Đã lưu bản nháp của section.",
        onError: (error) => {
          noteConflict(error);
          if (isApiError(error) && error.code === "VALIDATION_FAILED") {
            const mapped: ContentErrors = {};
            for (const item of error.fieldErrors) mapped[item.field] = item.messages[0] ?? "Không hợp lệ.";
            setSectionErrors(mapped);
          }
        },
      },
    );
    if (saved) applyDetail(saved);
  }, [activeContent, applyDetail, definitionOf, detail, noteConflict, saveSection, selected]);

  const handleToggleVisible = useCallback(
    async (section: PageSection) => {
      if (!detail) return;
      const saved = await structureAction.run(
        async () => {
          await pagesApi.updateSection(detail.id, section.id, {
            version: section.version,
            isVisible: !section.isVisible,
          });
          return pagesApi.get(detail.id);
        },
        {
          successMessage: section.isVisible ? "Đã ẩn section." : "Đã hiện section.",
          onError: noteConflict,
        },
      );
      if (saved) page.setData(saved);
    },
    [detail, noteConflict, page, structureAction],
  );

  const handleMove = useCallback(
    async (index: number, delta: number) => {
      if (!detail) return;
      const target = index + delta;
      if (target < 0 || target >= sections.length) return;
      const ids = sections.map((section) => section.id);
      const [moved] = ids.splice(index, 1);
      ids.splice(target, 0, moved);
      const saved = await structureAction.run(
        async () => {
          await pagesApi.reorderSections(detail.id, ids);
          return pagesApi.get(detail.id);
        },
        { successMessage: "Đã đổi thứ tự section.", onError: noteConflict },
      );
      if (saved) page.setData(saved);
    },
    [detail, noteConflict, page, sections, structureAction],
  );

  const handleAddSection = useCallback(
    async (type: string) => {
      if (!detail) return;
      const created = await structureAction.run(
        async () => {
          const section = await pagesApi.addSection(detail.id, { type });
          const refreshed = await pagesApi.get(detail.id);
          return { section, refreshed };
        },
        { successMessage: "Đã thêm section mới.", onError: noteConflict },
      );
      if (created) {
        page.setData(created.refreshed);
        setDraft(null);
        setSectionErrors({});
        setSelectedId(created.section.id);
        setAddOpen(false);
      }
    },
    [detail, noteConflict, page, structureAction],
  );

  const handleDeleteSection = useCallback(
    async (section: PageSection) => {
      if (!detail) return;
      const ok = await confirm({
        title: "Xoá section này?",
        message: `Section “${section.sectionKey}” sẽ bị xoá khỏi trang. Không thể hoàn tác.`,
        confirmLabel: "Xoá section",
        danger: true,
      });
      if (!ok) return;
      const saved = await structureAction.run(
        async () => {
          await pagesApi.removeSection(detail.id, section.id);
          return pagesApi.get(detail.id);
        },
        { successMessage: "Đã xoá section.", onError: noteConflict },
      );
      if (saved) {
        page.setData(saved);
        setDraft(null);
        setSelectedId(saved.sections[0]?.id ?? null);
      }
    },
    [confirm, detail, noteConflict, page, structureAction],
  );

  // ---- page level actions ----------------------------------------------

  const handleSaveSeo = useCallback(async () => {
    if (!detail) return;
    setSeoErrors({});
    const saved = await seoAction.run(
      () =>
        pagesApi.update(detail.id, {
          version: detail.version,
          translations: {
            vi: translations.vi,
            en: translations.en,
          },
        }),
      {
        successMessage: "Đã lưu tiêu đề và SEO.",
        onError: (error) => {
          noteConflict(error);
          if (isApiError(error) && error.code === "VALIDATION_FAILED") {
            const mapped: Record<string, string> = {};
            for (const item of error.fieldErrors) mapped[item.field] = item.messages[0] ?? "Không hợp lệ.";
            setSeoErrors(mapped);
          }
        },
      },
    );
    if (saved) {
      page.setData(saved);
      setSeoDraft(null);
    }
  }, [detail, noteConflict, page, seoAction, translations]);

  const clientGaps = useMemo<PublishIssue[]>(() => {
    if (!detail) return [];
    const issues: PublishIssue[] = [];
    if (!detail.translations?.vi?.title?.trim()) {
      issues.push({ field: "Tiêu đề trang", message: "Thiếu bản dịch.", locale: "vi" });
    }
    if (!detail.translations?.en?.title?.trim()) {
      issues.push({ field: "Tiêu đề trang", message: "Thiếu bản dịch.", locale: "en" });
    }
    for (const section of sections) {
      if (!section.isVisible) continue;
      const definition = definitionOf(section.type);
      if (!definition) continue;
      const content =
        draft && draft.sectionId === section.id ? draft.content : normalizeContent(section.draftContent);
      for (const gap of findPublishGaps(definition, content, section.sectionKey)) {
        issues.push({
          field: `${section.sectionKey} · ${gap.label}`,
          message: gap.locale ? "Thiếu bản dịch." : "Còn thiếu nội dung bắt buộc.",
          locale: gap.locale,
        });
      }
    }
    return issues;
  }, [definitionOf, detail, draft, sections]);

  const handlePublish = useCallback(async () => {
    if (!detail) return;
    setPublishIssues([]);
    const saved = await publishAction.run(() => pagesApi.publish(detail.id), {
      successMessage: "Đã xuất bản trang.",
      onError: (error) => {
        noteConflict(error);
        setPublishIssues(issuesFromError(error));
      },
    });
    if (saved) applyDetail(saved);
  }, [applyDetail, detail, noteConflict, publishAction]);

  const handleUnpublish = useCallback(async () => {
    if (!detail) return;
    const ok = await confirm({
      title: "Gỡ xuất bản trang?",
      message: "Trang sẽ không còn hiển thị trên website. Bản nháp và lịch sử vẫn được giữ lại.",
      confirmLabel: "Gỡ xuất bản",
      danger: true,
    });
    if (!ok) return;
    const saved = await publishAction.run(() => pagesApi.unpublish(detail.id), {
      successMessage: "Đã gỡ xuất bản.",
      onError: noteConflict,
    });
    if (saved) applyDetail(saved);
  }, [applyDetail, confirm, detail, noteConflict, publishAction]);

  const handleDiscardDraft = useCallback(async () => {
    if (!detail) return;
    const ok = await confirm({
      title: "Bỏ toàn bộ bản nháp?",
      message:
        "Mọi thay đổi chưa xuất bản của trang sẽ quay lại nội dung đang chạy. Section chưa từng xuất bản sẽ bị xoá.",
      confirmLabel: "Bỏ bản nháp",
      danger: true,
    });
    if (!ok) return;
    const saved = await publishAction.run(() => pagesApi.discardDraft(detail.id), {
      successMessage: "Đã bỏ bản nháp.",
      onError: noteConflict,
    });
    if (saved) applyDetail(saved);
  }, [applyDetail, confirm, detail, noteConflict, publishAction]);

  // ---- render ------------------------------------------------------------

  if (page.loading && !detail) {
    return (
      <Panel>
        <TableSkeleton rows={6} columns={3} />
      </Panel>
    );
  }
  if (page.error || !detail) {
    return <ErrorState error={page.error} onRetry={page.refetch} />;
  }

  const definition = selected ? definitionOf(selected.type) : undefined;
  const busy = saveSection.pending || structureAction.pending || publishAction.pending;
  const issues = publishIssues.length > 0 ? publishIssues : clientGaps;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/pages"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-accent"
          >
            <ArrowLeft size={15} />
            Tất cả trang
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {detail.title.vi ?? detail.title.en ?? "(chưa có tiêu đề)"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{detail.path}</span>
            {detail.status === "published" ? (
              <Chip tone="emerald">Đã xuất bản</Chip>
            ) : (
              <Chip tone="slate">Chưa xuất bản</Chip>
            )}
            {detail.hasUnpublishedChanges && <Chip tone="amber">Có thay đổi chưa xuất bản</Chip>}
            {detail.isSystem && <Chip tone="sky">Trang hệ thống</Chip>}
            <span className="text-xs text-slate-400">
              Cập nhật {formatDateTime(detail.updatedAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActionButton icon={<Eye size={15} />} onClick={() => setPreviewOpen(true)}>
            Xem trước
          </ActionButton>
          <ActionButton icon={<History size={15} />} onClick={() => setRevisionsOpen(true)}>
            Lịch sử phiên bản
          </ActionButton>
          {canUpdate && (
            <ActionButton
              icon={<RotateCcw size={15} />}
              pending={publishAction.pending}
              onClick={() => void handleDiscardDraft()}
            >
              Bỏ bản nháp
            </ActionButton>
          )}
          {canPublish && detail.status === "published" && (
            <ActionButton
              tone="danger"
              pending={publishAction.pending}
              onClick={() => void handleUnpublish()}
            >
              Gỡ xuất bản
            </ActionButton>
          )}
          {canPublish && (
            <ActionButton
              tone="primary"
              icon={<Upload size={15} />}
              pending={publishAction.pending}
              onClick={() => void handlePublish()}
            >
              Xuất bản trang
            </ActionButton>
          )}
        </div>
      </div>

      {conflict && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <span>Người khác vừa sửa trang này. Hãy tải lại để lấy nội dung mới nhất.</span>
          <ActionButton size="sm" onClick={reload}>
            Tải lại
          </ActionButton>
        </div>
      )}

      {issues.length > 0 && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-medium">
            {publishIssues.length > 0
              ? "Chưa xuất bản được, còn thiếu:"
              : "Cần bổ sung trước khi xuất bản:"}
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
            {issues.slice(0, 12).map((issue, index) => (
              <li key={`${issue.field}-${issue.locale ?? ""}-${index}`}>
                {issue.field}
                {issue.locale ? ` (${LOCALE_SHORT_LABELS[issue.locale]})` : ""} — {issue.message}
              </li>
            ))}
            {issues.length > 12 && <li>… và {issues.length - 12} mục khác.</li>}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel
            title="Các section"
            action={
              canUpdate ? (
                <ActionButton size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
                  Thêm
                </ActionButton>
              ) : undefined
            }
          >
            {sections.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500">
                Trang này chưa có section nào.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {sections.map((section, index) => {
                  const active = section.id === selected?.id;
                  const typeLabel = definitionOf(section.type)?.label.vi ?? section.type;
                  return (
                    <li
                      key={section.id}
                      className={`rounded-lg border px-2.5 py-2 transition-colors ${
                        active ? "border-accent bg-accent/5" : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSelect(section)}
                          className="min-w-0 flex-1 text-left focus:outline-none"
                        >
                          <span
                            className={`block truncate text-sm font-medium ${
                              active ? "text-accent" : "text-slate-800"
                            }`}
                          >
                            {typeLabel}
                          </span>
                          <span className="block truncate font-mono text-[11px] text-slate-400">
                            {section.sectionKey}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {!section.isVisible && <Chip tone="slate">Đang ẩn</Chip>}
                            {section.hasUnpublishedChanges && <Chip tone="amber">Chưa xuất bản</Chip>}
                            {section.isSystem && <Chip tone="sky">Hệ thống</Chip>}
                          </span>
                        </button>
                        {canUpdate && (
                          <div className="flex shrink-0 flex-col items-center">
                            <div className="flex">
                              <button
                                type="button"
                                disabled={index === 0 || busy}
                                onClick={() => void handleMove(index, -1)}
                                aria-label={`Di chuyển ${section.sectionKey} lên trên`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white hover:text-slate-800 disabled:opacity-30"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={index === sections.length - 1 || busy}
                                onClick={() => void handleMove(index, 1)}
                                aria-label={`Di chuyển ${section.sectionKey} xuống dưới`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white hover:text-slate-800 disabled:opacity-30"
                              >
                                <ArrowDown size={14} />
                              </button>
                            </div>
                            <div className="flex">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleToggleVisible(section)}
                                aria-label={
                                  section.isVisible
                                    ? `Ẩn ${section.sectionKey}`
                                    : `Hiện ${section.sectionKey}`
                                }
                                className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white hover:text-slate-800 disabled:opacity-30"
                              >
                                {section.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>
                              {!section.isSystem && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleDeleteSection(section)}
                                  aria-label={`Xoá ${section.sectionKey}`}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Tiêu đề & SEO">
            <p className="mb-3 text-xs text-slate-500">
              Những thay đổi này có hiệu lực ngay khi lưu, không cần xuất bản lại.
            </p>
            <LocaleTabs
              value={seoLocale.locale}
              onChange={seoLocale.setLocale}
              incomplete={{
                vi: !translations.vi?.title?.trim(),
                en: !translations.en?.title?.trim(),
              }}
              className="mb-4"
            />
            <PageSeoForm
              locale={seoLocale.locale}
              value={translations[seoLocale.locale] ?? toTranslationInput(undefined)}
              onChange={(value) =>
                setSeoDraft({ ...translations, [seoLocale.locale]: value })
              }
              errors={seoErrors}
              disabled={!canUpdate}
            />
            {canUpdate && (
              <div className="mt-4 flex items-center gap-3">
                <ActionButton
                  tone="primary"
                  icon={<Save size={15} />}
                  pending={seoAction.pending}
                  disabled={!seoDirty}
                  onClick={() => void handleSaveSeo()}
                >
                  Lưu tiêu đề & SEO
                </ActionButton>
                {seoDirty && <span className="text-xs text-amber-600">Có thay đổi chưa lưu</span>}
              </div>
            )}
          </Panel>
        </div>

        <Panel
          title={
            selected
              ? `Nội dung: ${definitionOf(selected.type)?.label.vi ?? selected.type}`
              : "Nội dung section"
          }
        >
          {!selected || !definition ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
              Chọn một section ở cột bên trái, hoặc thêm section mới.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <LocaleTabs
                value={sectionLocale.locale}
                onChange={sectionLocale.setLocale}
                action={
                  <span className="text-xs text-slate-400">
                    Các ô không có tab ngôn ngữ dùng chung cho cả hai ngôn ngữ.
                  </span>
                }
              />
              <SectionForm
                definition={definition}
                content={activeContent}
                locale={sectionLocale.locale}
                errors={sectionErrors}
                disabled={!canUpdate}
                onChange={(content) => setDraft({ sectionId: selected.id, content })}
              />
              {canUpdate && (
                <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center gap-3 border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
                  <ActionButton
                    tone="primary"
                    icon={<Save size={15} />}
                    pending={saveSection.pending}
                    disabled={!sectionDirty}
                    onClick={() => void handleSaveDraft()}
                  >
                    Lưu nháp
                  </ActionButton>
                  {sectionDirty ? (
                    <span className="text-xs text-amber-600">Có thay đổi chưa lưu</span>
                  ) : selected.hasUnpublishedChanges ? (
                    <span className="text-xs text-slate-500">
                      Đã lưu nháp, chưa xuất bản ra website.
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Nội dung đang trùng với bản đã xuất bản.</span>
                  )}
                  {sectionDirty && (
                    <ActionButton
                      onClick={() => {
                        setDraft(null);
                        setSectionErrors({});
                      }}
                    >
                      Huỷ thay đổi
                    </ActionButton>
                  )}
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      <AddSectionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        types={registry.data ?? []}
        pending={structureAction.pending}
        onAdd={(type) => void handleAddSection(type)}
      />

      {previewOpen && (
        <PagePreviewDialog
          open
          onClose={() => setPreviewOpen(false)}
          pageId={detail.id}
          sectionTypes={detail.sectionTypes ?? {}}
        />
      )}

      {revisionsOpen && (
        <PageRevisionsDialog
          open
          onClose={() => setRevisionsOpen(false)}
          pageId={detail.id}
          canRevert={canUpdate}
          onReverted={applyDetail}
        />
      )}
    </div>
  );
}
