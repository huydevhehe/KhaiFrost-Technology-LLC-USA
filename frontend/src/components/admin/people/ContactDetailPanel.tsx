"use client";

import { useState } from "react";
import { Check, Loader2, Send, Trash2, X } from "lucide-react";
import { Panel, Select, Textarea } from "@/components/admin/ui";
import {
  ErrorState,
  TableSkeleton,
  formatDateTime,
  useApiAction,
  useApiResource,
  useConfirm,
} from "@/components/admin/shared";
import {
  CONTACT_NOTE_MAX,
  CONTACT_STATUS_LABELS,
  CONTACT_STATUS_TRANSITIONS,
  contactsApi,
  type ContactDetail,
  type ContactNote,
  type ContactStatus,
} from "@/lib/api/admin/contacts";
import type { AdminUser } from "@/lib/api/admin/users";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const STATUS_TONES: Record<ContactStatus, string> = {
  new: "bg-sky-50 text-sky-700",
  seen: "bg-amber-50 text-amber-700",
  replied: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-600",
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {CONTACT_STATUS_LABELS[status]}
    </span>
  );
}

const STATUS_ACTION_LABELS: Record<ContactStatus, string> = {
  new: "Đánh dấu mới",
  seen: "Đánh dấu đã xem",
  replied: "Đánh dấu đã phản hồi",
  archived: "Lưu trữ",
};

export interface ContactDetailPanelProps {
  contactId: string;
  /** Staff accounts a contact can be assigned to (empty when the user may not list them). */
  staff: AdminUser[];
  onClose: () => void;
  /** Called after any change so the list can refresh. */
  onChanged: () => void;
  onDeleted: () => void;
}

export function ContactDetailPanel({
  contactId,
  staff,
  onClose,
  onChanged,
  onDeleted,
}: ContactDetailPanelProps) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const action = useApiAction();
  const [note, setNote] = useState("");

  const detail = useApiResource<ContactDetail>(`/admin/contacts/${contactId}`);
  const notes = useApiResource<ContactNote[]>(`/admin/contacts/${contactId}/notes`);

  const can = (permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) =>
    !!user?.permissions.includes(permission);
  const data = detail.data;

  async function changeStatus(status: ContactStatus) {
    if (!data) return;
    const updated = await action.run(() => contactsApi.updateStatus(data.id, status), {
      successMessage: `Đã chuyển sang “${CONTACT_STATUS_LABELS[status]}”.`,
      onSuccess: onChanged,
    });
    if (updated) detail.setData(updated);
  }

  async function assign(assignedToId: string | null) {
    if (!data) return;
    const updated = await action.run(() => contactsApi.assign(data.id, assignedToId), {
      successMessage: assignedToId ? "Đã phân công liên hệ." : "Đã bỏ phân công.",
      onSuccess: onChanged,
    });
    if (updated) detail.setData(updated);
  }

  async function addNote() {
    if (!data) return;
    const text = note.trim();
    if (!text) return;
    const created = await action.run(() => contactsApi.addNote(data.id, text), {
      successMessage: "Đã thêm ghi chú.",
    });
    if (created) {
      setNote("");
      notes.refetch();
    }
  }

  async function remove() {
    if (!data) return;
    const ok = await confirm({
      title: "Xoá liên hệ?",
      message: `Liên hệ từ ${data.fullName} sẽ bị xoá khỏi hộp thư (xoá mềm).`,
      confirmLabel: "Xoá",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => contactsApi.remove(data.id), {
      successMessage: "Đã xoá liên hệ.",
    });
    if (done !== undefined) onDeleted();
  }

  const nextStatuses = data ? CONTACT_STATUS_TRANSITIONS[data.status] : [];

  return (
    <Panel
      title="Chi tiết liên hệ"
      action={
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:ring-2 focus:ring-accent/30 focus:outline-none"
        >
          <X size={16} />
        </button>
      }
    >
      {detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.refetch} retryLabel="Tải lại" />
      ) : detail.loading && !data ? (
        <TableSkeleton rows={5} columns={2} withHeader={false} />
      ) : data ? (
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <ContactStatusBadge status={data.status} />
            {data.isSpam && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                Nghi ngờ spam
              </span>
            )}
            <span className="text-xs text-slate-400">{formatDateTime(data.createdAt)}</span>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Họ tên</dt>
              <dd className="font-medium text-slate-900">{data.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Email</dt>
              <dd className="break-all text-slate-700">
                <a href={`mailto:${data.email}`} className="hover:text-accent hover:underline">
                  {data.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Điện thoại</dt>
              <dd className="text-slate-700">{data.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Ngôn ngữ</dt>
              <dd className="text-slate-700">{data.locale === "vi" ? "Tiếng Việt" : "English"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Chủ đề</dt>
              <dd className="text-slate-700">{data.subject ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Nội dung</dt>
              <dd className="mt-1 rounded-lg bg-slate-50 p-3 whitespace-pre-line text-slate-700">
                {data.message}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Trang gửi</dt>
              <dd className="break-all text-slate-500">{data.sourcePage ?? "—"}</dd>
            </div>
          </dl>

          {can(PERMISSIONS.CONTACT_UPDATE) && nextStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {nextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => void changeStatus(status)}
                  disabled={action.pending}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
                >
                  <Check size={15} />
                  {STATUS_ACTION_LABELS[status]}
                </button>
              ))}
            </div>
          )}

          {can(PERMISSIONS.CONTACT_ASSIGN) && (
            <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
              <label htmlFor="contactAssignee" className="text-sm font-medium text-slate-700">
                Phân công xử lý
              </label>
              <Select
                id="contactAssignee"
                value={data.assignedToId ?? ""}
                disabled={action.pending || staff.length === 0}
                onChange={(event) => void assign(event.target.value || null)}
              >
                <option value="">Chưa phân công</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
                {data.assignedToId && !staff.some((member) => member.id === data.assignedToId) && (
                  <option value={data.assignedToId}>Nhân sự khác</option>
                )}
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700">Ghi chú nội bộ</p>
            {notes.error ? (
              <ErrorState error={notes.error} onRetry={notes.refetch} retryLabel="Tải lại" />
            ) : notes.loading && !notes.data ? (
              <TableSkeleton rows={2} columns={1} withHeader={false} />
            ) : (notes.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-400">Chưa có ghi chú nào.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {notes.data?.map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="whitespace-pre-line text-slate-700">{item.note}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}

            {can(PERMISSIONS.CONTACT_UPDATE) && (
              <div className="flex flex-col gap-2">
                <label htmlFor="contactNote" className="sr-only">
                  Thêm ghi chú nội bộ
                </label>
                <Textarea
                  id="contactNote"
                  rows={3}
                  value={note}
                  maxLength={CONTACT_NOTE_MAX}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ghi chú cho đồng nghiệp…"
                  disabled={action.pending}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    {note.length}/{CONTACT_NOTE_MAX}
                  </span>
                  <button
                    type="button"
                    onClick={() => void addNote()}
                    disabled={action.pending || note.trim().length === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
                  >
                    {action.pending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    Thêm ghi chú
                  </button>
                </div>
              </div>
            )}
          </div>

          {can(PERMISSIONS.CONTACT_DELETE) && (
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => void remove()}
                disabled={action.pending}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-50"
              >
                <Trash2 size={15} />
                Xoá liên hệ
              </button>
            </div>
          )}
        </div>
      ) : null}
    </Panel>
  );
}
