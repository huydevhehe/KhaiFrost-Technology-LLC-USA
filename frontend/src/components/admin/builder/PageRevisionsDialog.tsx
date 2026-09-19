"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { Modal, formatDateTime, useApiAction, useConfirm } from "@/components/admin/shared";
import { isApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errorMessages";
import {
  pagesApi,
  type PageDetail,
  type PageRevisionDetail,
  type PageRevisionSummary,
} from "@/lib/api/admin/pages";
import { ActionButton } from "./controls";

export interface PageRevisionsDialogProps {
  open: boolean;
  onClose: () => void;
  pageId: string;
  canRevert: boolean;
  /** Called with the refreshed page after a successful revert. */
  onReverted: (page: PageDetail) => void;
}

/** Revision history with a snapshot viewer and "Khôi phục" (restores as draft). */
export function PageRevisionsDialog({
  open,
  onClose,
  pageId,
  canRevert,
  onReverted,
}: PageRevisionsDialogProps) {
  const confirm = useConfirm();
  const revertAction = useApiAction();
  const [items, setItems] = useState<PageRevisionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PageRevisionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await pagesApi.revisions(pageId, { pageSize: 50 }, controller.signal);
        if (!cancelled) setItems(result.items);
      } catch (caught) {
        if (cancelled || (isApiError(caught) && caught.code === "ABORTED")) return;
        setError(describeApiError(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, pageId]);

  const view = useCallback(
    async (revisionNumber: number) => {
      setDetailLoading(true);
      try {
        setSelected(await pagesApi.revision(pageId, revisionNumber));
      } catch (caught) {
        setError(describeApiError(caught));
      } finally {
        setDetailLoading(false);
      }
    },
    [pageId],
  );

  const revert = useCallback(
    async (revisionNumber: number) => {
      const ok = await confirm({
        title: `Khôi phục phiên bản #${revisionNumber}?`,
        message:
          "Nội dung của phiên bản này sẽ được đưa vào bản nháp. Trang đang chạy chưa thay đổi cho tới khi bạn xuất bản lại.",
        confirmLabel: "Khôi phục",
      });
      if (!ok) return;
      const page = await revertAction.run(() => pagesApi.revert(pageId, revisionNumber), {
        successMessage: "Đã khôi phục vào bản nháp.",
      });
      if (page) {
        onReverted(page);
        onClose();
      }
    },
    [confirm, onClose, onReverted, pageId, revertAction],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lịch sử phiên bản"
      description="Mỗi lần xuất bản tạo một phiên bản. Khôi phục sẽ đưa nội dung về bản nháp."
      size="lg"
      footer={<ActionButton onClick={onClose}>Đóng</ActionButton>}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-2">
          {loading && <p className="text-sm text-slate-500">Đang tải…</p>}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {!loading && items.length === 0 && !error && (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
              Trang này chưa từng được xuất bản.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {items.map((revision) => (
              <li
                key={revision.id}
                className={`rounded-lg border px-3 py-2.5 ${
                  selected?.revisionNumber === revision.revisionNumber
                    ? "border-accent bg-accent/5"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      Phiên bản #{revision.revisionNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(revision.createdAt)} · {revision.sectionCount} section
                    </p>
                    {revision.note && (
                      <p className="mt-0.5 text-xs text-slate-500 italic">{revision.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ActionButton
                      size="sm"
                      icon={<History size={13} />}
                      pending={detailLoading && selected?.revisionNumber === revision.revisionNumber}
                      onClick={() => void view(revision.revisionNumber)}
                    >
                      Xem
                    </ActionButton>
                    {canRevert && (
                      <ActionButton
                        size="sm"
                        tone="primary"
                        icon={<RotateCcw size={13} />}
                        pending={revertAction.pending}
                        onClick={() => void revert(revision.revisionNumber)}
                      >
                        Khôi phục
                      </ActionButton>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          {selected ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-slate-900">
                Nội dung phiên bản #{selected.revisionNumber}
              </p>
              <ul className="flex flex-col gap-2">
                {selected.snapshot.sections.map((section) => (
                  <li key={section.sectionKey} className="rounded-lg bg-white px-3 py-2">
                    <p className="text-sm font-medium text-slate-800">{section.sectionKey}</p>
                    <p className="text-xs text-slate-500">
                      {section.type} · {section.isVisible ? "đang hiển thị" : "đang ẩn"}
                    </p>
                    <p className="mt-1 line-clamp-3 font-mono text-[11px] break-all text-slate-400">
                      {JSON.stringify(section.content.translations?.vi ?? {})}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              Chọn “Xem” để đọc nội dung của một phiên bản.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
