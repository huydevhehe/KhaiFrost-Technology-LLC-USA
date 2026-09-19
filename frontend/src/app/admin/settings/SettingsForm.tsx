"use client";

import type { FormEvent, ReactNode } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { ErrorState, TableSkeleton, formatDateTime } from "@/components/admin/shared";
import type { SettingGroupState } from "./useSettingGroup";

export interface SettingsFormProps<T> {
  title: string;
  description?: string;
  state: SettingGroupState<T>;
  /** Hides the save button and disables the inputs (no setting:update permission). */
  readOnly: boolean;
  onSubmit: () => void;
  children: ReactNode;
}

/** Shell shared by every settings group: loading, error, conflict and the save bar. */
export function SettingsForm<T>({
  title,
  description,
  state,
  readOnly,
  onSubmit,
  children,
}: SettingsFormProps<T>) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (state.pending || readOnly) return;
    onSubmit();
  }

  if (state.error) {
    return <ErrorState error={state.error} onRetry={state.reload} retryLabel="Tải lại" />;
  }
  if (state.loading && !state.data) {
    return (
      <Panel>
        <TableSkeleton rows={5} columns={2} />
      </Panel>
    );
  }
  if (!state.data) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {state.conflict && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <span>Cài đặt này vừa được người khác lưu. Hãy tải lại rồi nhập lại thay đổi của bạn.</span>
          <button
            type="button"
            onClick={state.reload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 font-medium text-amber-800 transition-colors hover:bg-amber-100 focus:ring-2 focus:ring-amber-300 focus:outline-none"
          >
            <RotateCcw size={14} />
            Tải lại
          </button>
        </div>
      )}

      <Panel title={title}>
        {description && <p className="-mt-2 mb-4 text-sm text-slate-500">{description}</p>}
        {readOnly && (
          <p role="status" className="mb-4 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
            Bạn chỉ có quyền xem cài đặt này.
          </p>
        )}
        <div className="flex flex-col gap-4">{children}</div>
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        {!readOnly && (
          <button
            type="submit"
            disabled={state.pending}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-60"
          >
            {state.pending && <Loader2 size={15} className="animate-spin" />}
            Lưu thay đổi
          </button>
        )}
        <span className="text-xs text-slate-400">
          {state.data.isDefault
            ? "Đang dùng giá trị mặc định, chưa từng được lưu."
            : `Cập nhật lần cuối: ${formatDateTime(state.data.updatedAt)}`}
        </span>
      </div>
    </form>
  );
}
