"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input, Panel, Select } from "@/components/admin/ui";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
  formatDateTime,
  useApiList,
  useFilters,
} from "@/components/admin/shared";
import { Pager } from "@/components/admin/system/Pager";
import {
  ContactDetailPanel,
  ContactStatusBadge,
} from "@/components/admin/people/ContactDetailPanel";
import {
  CONTACT_STATUSES,
  CONTACT_STATUS_LABELS,
  type ContactListItem,
  type ContactListMeta,
  type ContactStatus,
} from "@/lib/api/admin/contacts";
import { toIsoBound } from "@/lib/api/admin/auditLog";
import type { AdminUser } from "@/lib/api/admin/users";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 20;

export default function AdminContactsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ContactStatus | "">("");
  const [assignee, setAssignee] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const canReadUsers = !!user?.permissions.includes(PERMISSIONS.USER_READ);

  const filters = useFilters({
    status: status || undefined,
    assignedToId: assignee || undefined,
    from: toIsoBound(from, "start"),
    to: toIsoBound(to, "end"),
  });
  const list = useApiList<ContactListItem>("/admin/contacts", {
    pageSize: PAGE_SIZE,
    filters,
    keepPreviousData: true,
  });
  const staffList = useApiList<AdminUser>("/admin/users", {
    pageSize: 100,
    enabled: canReadUsers,
  });

  const unreadCount = (list.meta as ContactListMeta).unreadCount ?? 0;
  const staff = staffList.items;
  const staffName = (id: string | null) =>
    id ? (staff.find((member) => member.id === id)?.fullName ?? "Nhân sự khác") : "Chưa phân công";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Hộp thư liên hệ</h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
            {unreadCount.toLocaleString("vi-VN")} chưa xem
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className={selectedId ? "xl:col-span-2" : "xl:col-span-3"}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="relative min-w-55 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              />
              <label htmlFor="contactSearch" className="sr-only">
                Tìm theo tên, email hoặc chủ đề
              </label>
              <Input
                id="contactSearch"
                type="search"
                placeholder="Tìm theo tên, email hoặc chủ đề…"
                className="pl-9"
                value={list.search}
                onChange={(event) => list.setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactStatus" className="text-xs font-medium text-slate-500">
                Trạng thái
              </label>
              <Select
                id="contactStatus"
                className="w-40"
                value={status}
                onChange={(event) => setStatus(event.target.value as ContactStatus | "")}
              >
                <option value="">Tất cả</option>
                {CONTACT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {CONTACT_STATUS_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>
            {canReadUsers && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contactAssigneeFilter" className="text-xs font-medium text-slate-500">
                  Phụ trách
                </label>
                <Select
                  id="contactAssigneeFilter"
                  className="w-44"
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                >
                  <option value="">Tất cả nhân sự</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactFrom" className="text-xs font-medium text-slate-500">
                Từ ngày
              </label>
              <Input
                id="contactFrom"
                type="date"
                className="w-40"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contactTo" className="text-xs font-medium text-slate-500">
                Đến ngày
              </label>
              <Input
                id="contactTo"
                type="date"
                className="w-40"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </div>

          {list.error ? (
            <ErrorState error={list.error} onRetry={list.refetch} retryLabel="Tải lại" />
          ) : list.loading && list.items.length === 0 ? (
            <TableSkeleton rows={6} columns={5} />
          ) : list.items.length === 0 ? (
            <EmptyState
              title="Không có liên hệ nào"
              description="Liên hệ gửi từ website sẽ xuất hiện tại đây."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                    <th className="py-3 pr-4 font-medium">Người gửi</th>
                    <th className="py-3 pr-4 font-medium">Nội dung</th>
                    <th className="py-3 pr-4 font-medium">Phụ trách</th>
                    <th className="py-3 pr-4 font-medium">Ngày gửi</th>
                    <th className="py-3 pr-4 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`cursor-pointer text-slate-700 ${selectedId === item.id ? "bg-accent/5" : ""}`}
                    >
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className="text-left focus:ring-2 focus:ring-accent/30 focus:outline-none"
                        >
                          <span
                            className={`block ${item.status === "new" ? "font-semibold" : "font-medium"} text-slate-900`}
                          >
                            {item.fullName}
                          </span>
                          <span className="block text-xs text-slate-500">{item.email}</span>
                        </button>
                      </td>
                      <td className="max-w-xs py-3 pr-4 text-slate-500">
                        {item.subject && <p className="truncate font-medium text-slate-700">{item.subject}</p>}
                        <p className="truncate">{item.messagePreview}</p>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{staffName(item.assignedToId)}</td>
                      <td className="py-3 pr-4 text-slate-500">{formatDateTime(item.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <ContactStatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pager
            page={list.page}
            totalPages={list.meta.totalPages}
            totalLabel={`Tổng: ${list.meta.total.toLocaleString("vi-VN")} liên hệ`}
            onChange={list.setPage}
            disabled={list.loading}
          />
        </Panel>

        {selectedId && (
          <ContactDetailPanel
            key={selectedId}
            contactId={selectedId}
            staff={staff}
            onClose={() => setSelectedId(null)}
            onChanged={list.refetch}
            onDeleted={() => {
              setSelectedId(null);
              list.refetch();
            }}
          />
        )}
      </div>
    </div>
  );
}
