"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Field, Input, Textarea } from "@/components/admin/ui";
import {
  ErrorState,
  ImageThumb,
  LocaleTabs,
  Modal,
  TableSkeleton,
  TranslatedFields,
  formatBytes,
  formatDateTime,
  formatDimensions,
  useApiAction,
  useApiResource,
  useConfirm,
  useLocaleTabs,
  type Locale,
} from "@/components/admin/shared";
import {
  describeMediaError,
  mediaApi,
  type MediaAssetDetail,
} from "@/lib/api/admin/media";
import { isApiError } from "@/lib/api/client";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const ALT_MAX = 300;
const CAPTION_MAX = 500;
const DISPLAY_NAME_MAX = 255;
const FOLDER_MAX = 100;

type TextPair = Record<Locale, string>;

export interface MediaDetailModalProps {
  assetId: string | null;
  onClose: () => void;
  /** Called after a successful save or delete. */
  onChanged: () => void;
}

export function MediaDetailModal({ assetId, onClose, onChanged }: MediaDetailModalProps) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const action = useApiAction();
  const tabs = useLocaleTabs();

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    id: string;
    displayName: string;
    folder: string;
    altText: TextPair;
    caption: TextPair;
  } | null>(null);

  const resource = useApiResource<MediaAssetDetail>(assetId ? `/admin/media/${assetId}` : null);
  const data = resource.data;
  const canDelete = !!user?.permissions.includes(PERMISSIONS.MEDIA_DELETE);
  const canEdit = !!user?.permissions.includes(PERMISSIONS.MEDIA_UPLOAD);

  // Derive the editable copy from the loaded asset without an effect.
  const values =
    form && data && form.id === data.id
      ? form
      : data
        ? {
            id: data.id,
            displayName: data.displayName ?? "",
            folder: data.folder ?? "",
            altText: { vi: data.altText.vi ?? "", en: data.altText.en ?? "" } as TextPair,
            caption: { vi: data.caption.vi ?? "", en: data.caption.en ?? "" } as TextPair,
          }
        : null;

  function patch(next: Partial<NonNullable<typeof values>>) {
    if (!values) return;
    setForm({ ...values, ...next });
  }

  async function save() {
    if (!data || !values) return;
    const updated = await action.run(
      () =>
        mediaApi.update(data.id, {
          version: data.version,
          displayName: values.displayName.trim() || null,
          folder: values.folder.trim() || null,
          translations: {
            vi: { altText: values.altText.vi.trim() || null, caption: values.caption.vi.trim() || null },
            en: { altText: values.altText.en.trim() || null, caption: values.caption.en.trim() || null },
          },
        }),
      { successMessage: "Đã lưu thông tin tệp." },
    );
    if (updated) {
      resource.setData(updated);
      setForm(null);
      onChanged();
    }
  }

  async function remove() {
    if (!data) return;
    const ok = await confirm({
      title: "Xoá tệp?",
      message: `Tệp “${data.name}” sẽ bị xoá vĩnh viễn khỏi thư viện.`,
      confirmLabel: "Xoá",
      danger: true,
    });
    if (!ok) return;
    setDeleteError(null);
    const done = await action.run(() => mediaApi.remove(data.id), {
      successMessage: "Đã xoá tệp.",
      showErrorToast: false,
      onError: (error, message) => {
        const code = isApiError(error) ? error.code : undefined;
        setDeleteError(
          code === "MEDIA_IN_USE"
            ? `${describeMediaError(code)} Hãy gỡ tệp khỏi các nội dung trong danh sách “Đang được dùng” rồi thử lại.`
            : message,
        );
      },
    });
    if (done !== undefined) {
      onChanged();
      onClose();
    }
  }

  return (
    <Modal
      open={assetId !== null}
      onClose={onClose}
      title="Chi tiết tệp"
      size="lg"
      footer={
        data ? (
          <>
            {canDelete && (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={action.pending}
                className="mr-auto inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-50"
              >
                <Trash2 size={15} />
                Xoá tệp
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none"
            >
              Đóng
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => void save()}
                disabled={action.pending}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-60"
              >
                {action.pending && <Loader2 size={15} className="animate-spin" />}
                Lưu thay đổi
              </button>
            )}
          </>
        ) : null
      }
    >
      {resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.refetch} retryLabel="Tải lại" />
      ) : resource.loading && !data ? (
        <TableSkeleton rows={5} columns={2} withHeader={false} />
      ) : data && values ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <ImageThumb
              src={data.url}
              alt={data.name}
              kind={data.kind}
              width="100%"
              height={220}
              fit="contain"
              rounded="lg"
            />
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Tên tệp gốc</dt>
                <dd className="truncate text-slate-800">{data.originalName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Định dạng</dt>
                <dd className="text-slate-800">{data.mimeType}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Kích thước</dt>
                <dd className="text-slate-800">
                  {formatBytes(data.sizeBytes)} · {formatDimensions(data.width, data.height)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Tải lên</dt>
                <dd className="text-slate-800">{formatDateTime(data.createdAt)}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-slate-500">Đường dẫn</dt>
                <dd>
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-accent hover:underline"
                  >
                    {data.url}
                  </a>
                </dd>
              </div>
            </dl>

            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Đang được dùng</p>
              {data.usages.length === 0 ? (
                <p className="text-sm text-slate-400">Chưa có nội dung nào dùng tệp này.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm text-slate-600">
                  {data.usages.map((usage, index) => (
                    <li key={`${usage.entityName}-${usage.entityId ?? index}-${usage.field}`}>
                      {usage.entityName} · {usage.field}
                      {usage.entityId && (
                        <span className="block font-mono text-xs break-all text-slate-400">
                          {usage.entityId}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Field label="Tên hiển thị" htmlFor="mediaDisplayName">
              <Input
                id="mediaDisplayName"
                value={values.displayName}
                maxLength={DISPLAY_NAME_MAX}
                disabled={!canEdit || action.pending}
                onChange={(event) => patch({ displayName: event.target.value })}
                placeholder={data.originalName}
              />
            </Field>
            <Field
              label="Thư mục"
              htmlFor="mediaFolder"
              hint="Chỉ gồm chữ, số, khoảng trắng, gạch ngang, gạch dưới và dấu /."
            >
              <Input
                id="mediaFolder"
                value={values.folder}
                maxLength={FOLDER_MAX}
                disabled={!canEdit || action.pending}
                onChange={(event) => patch({ folder: event.target.value })}
                placeholder="vd: du-an/2026"
              />
            </Field>

            <div className="flex flex-col gap-3">
              <LocaleTabs value={tabs.locale} onChange={tabs.setLocale} disabled={action.pending} />
              {(["vi", "en"] as Locale[]).map((locale) => (
                <TranslatedFields key={locale} locale={locale} active={tabs.locale}>
                  <div className="flex flex-col gap-4">
                    <Field label="Văn bản thay thế (alt)" htmlFor={`mediaAlt-${locale}`}>
                      <Input
                        id={`mediaAlt-${locale}`}
                        value={values.altText[locale]}
                        maxLength={ALT_MAX}
                        disabled={!canEdit || action.pending}
                        onChange={(event) =>
                          patch({ altText: { ...values.altText, [locale]: event.target.value } })
                        }
                      />
                    </Field>
                    <Field label="Chú thích" htmlFor={`mediaCaption-${locale}`}>
                      <Textarea
                        id={`mediaCaption-${locale}`}
                        rows={3}
                        value={values.caption[locale]}
                        maxLength={CAPTION_MAX}
                        disabled={!canEdit || action.pending}
                        onChange={(event) =>
                          patch({ caption: { ...values.caption, [locale]: event.target.value } })
                        }
                      />
                    </Field>
                  </div>
                </TranslatedFields>
              ))}
            </div>

            {deleteError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
