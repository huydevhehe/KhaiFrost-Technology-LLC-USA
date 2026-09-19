"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Save, Settings } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import {
  ErrorState,
  LocaleTabs,
  TableSkeleton,
  useApiAction,
  useApiList,
  useApiResource,
  useLocaleTabs,
  type Locale,
} from "@/components/admin/shared";
import {
  ActionButton,
  Chip,
  GoogleSnippet,
  PageSeoForm,
  toTranslationInput,
  useUnsavedGuard,
} from "@/components/admin/builder";
import { isApiError } from "@/lib/api/client";
import {
  pagesApi,
  type PageDetail,
  type PageSummary,
  type PageTranslationInput,
} from "@/lib/api/admin/pages";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

export default function AdminSeoPage() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission(PERMISSIONS.PAGE_UPDATE);

  const list = useApiList<PageSummary>("/admin/pages", { pageSize: 100 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? list.items[0]?.id ?? null;
  const detailResource = useApiResource<PageDetail>(activeId ? `/admin/pages/${activeId}` : null);
  const detail = detailResource.data;

  const [draft, setDraft] = useState<
    { pageId: string; values: Partial<Record<Locale, PageTranslationInput>> } | null
  >(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const locale = useLocaleTabs("vi");
  const save = useApiAction();

  const base = useMemo<Partial<Record<Locale, PageTranslationInput>>>(
    () => ({
      vi: toTranslationInput(detail?.translations?.vi),
      en: toTranslationInput(detail?.translations?.en),
    }),
    [detail],
  );
  const values = draft && detail && draft.pageId === detail.id ? draft.values : base;
  const dirty = Boolean(
    draft && detail && draft.pageId === detail.id && JSON.stringify(draft.values) !== JSON.stringify(base),
  );
  useUnsavedGuard(dirty);

  const current = values[locale.locale] ?? toTranslationInput(undefined);

  const handleSave = useCallback(async () => {
    if (!detail) return;
    setErrors({});
    const saved = await save.run(
      () =>
        pagesApi.update(detail.id, {
          version: detail.version,
          translations: { vi: values.vi, en: values.en },
        }),
      {
        successMessage: "Đã lưu cài đặt SEO.",
        onError: (error) => {
          if (isApiError(error) && error.code === "VERSION_CONFLICT") setConflict(true);
          if (isApiError(error) && error.code === "VALIDATION_FAILED") {
            const mapped: Record<string, string> = {};
            for (const item of error.fieldErrors) mapped[item.field] = item.messages[0] ?? "Không hợp lệ.";
            setErrors(mapped);
          }
        },
      },
    );
    if (saved) {
      detailResource.setData(saved);
      setDraft(null);
      setConflict(false);
      list.refetch();
    }
  }, [detail, detailResource, list, save, values]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cài đặt SEO</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tiêu đề, mô tả và ảnh chia sẻ của từng trang, theo hai ngôn ngữ.
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Settings size={15} />
          SEO mặc định toàn site
          <ExternalLink size={13} className="text-slate-400" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <Panel title="Trang" className="h-fit">
          {list.loading && list.items.length === 0 ? (
            <TableSkeleton rows={5} columns={1} withHeader={false} />
          ) : list.error ? (
            <ErrorState error={list.error} onRetry={list.refetch} />
          ) : (
            <ul className="flex flex-col gap-1">
              {list.items.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(page.id);
                      setErrors({});
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      page.id === activeId
                        ? "bg-accent text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block truncate">
                      {page.title.vi ?? page.title.en ?? page.path}
                    </span>
                    <span
                      className={`block truncate font-mono text-[11px] ${
                        page.id === activeId ? "text-white/70" : "text-slate-400"
                      }`}
                    >
                      {page.path}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={detail ? `SEO — ${detail.path}` : "SEO"}>
          {detailResource.loading && !detail ? (
            <TableSkeleton rows={5} columns={2} />
          ) : detailResource.error ? (
            <ErrorState error={detailResource.error} onRetry={detailResource.refetch} />
          ) : !detail ? (
            <p className="py-10 text-center text-sm text-slate-500">Chọn một trang để chỉnh SEO.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {conflict && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                >
                  <span>Người khác vừa sửa trang này. Hãy tải lại trước khi lưu.</span>
                  <ActionButton
                    size="sm"
                    onClick={() => {
                      setDraft(null);
                      setConflict(false);
                      detailResource.refetch();
                    }}
                  >
                    Tải lại
                  </ActionButton>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {detail.status === "published" ? (
                  <Chip tone="emerald">Đã xuất bản</Chip>
                ) : (
                  <Chip tone="slate">Chưa xuất bản</Chip>
                )}
                <Link
                  href={`/admin/pages/${detail.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
                >
                  <Pencil size={13} />
                  Sửa nội dung trang
                </Link>
              </div>

              <LocaleTabs
                value={locale.locale}
                onChange={locale.setLocale}
                incomplete={{
                  vi: !values.vi?.seoTitle?.trim() && !values.vi?.title?.trim(),
                  en: !values.en?.seoTitle?.trim() && !values.en?.title?.trim(),
                }}
              />

              <PageSeoForm
                locale={locale.locale}
                value={current}
                onChange={(value) =>
                  setDraft({ pageId: detail.id, values: { ...values, [locale.locale]: value } })
                }
                errors={errors}
                disabled={!canUpdate}
              />

              {canUpdate && (
                <div className="flex items-center gap-3">
                  <ActionButton
                    tone="primary"
                    icon={<Save size={15} />}
                    pending={save.pending}
                    disabled={!dirty}
                    onClick={() => void handleSave()}
                  >
                    Lưu
                  </ActionButton>
                  {dirty && <span className="text-xs text-amber-600">Có thay đổi chưa lưu</span>}
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Xem trước Google" className="h-fit">
          <GoogleSnippet
            path={detail?.path ?? "/"}
            title={current.seoTitle?.trim() || current.title?.trim() || ""}
            description={current.seoDescription ?? ""}
          />
          <p className="mt-3 text-xs text-slate-500">
            Google thường hiển thị khoảng 60 ký tự tiêu đề và 160 ký tự mô tả.
          </p>
        </Panel>
      </div>
    </div>
  );
}
