"use client";

import { useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import { Input, Panel, Select } from "@/components/admin/ui";
import {
  EmptyState,
  ErrorState,
  Modal,
  TableSkeleton,
  formatDateTime,
  useApiAction,
  useApiList,
  useFilters,
} from "@/components/admin/shared";
import { Pager } from "@/components/admin/system/Pager";
import {
  auditLogApi,
  describeAuditAction,
  toIsoBound,
  type AuditLogEntry,
} from "@/lib/api/admin/auditLog";
import type { AdminUser } from "@/lib/api/admin/users";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 25;

/** Entities that appear in the trail, for the filter dropdown. */
const ENTITY_OPTIONS = [
  "Post",
  "Product",
  "Project",
  "ServiceCategory",
  "Page",
  "Testimonial",
  "ClientLocation",
  "MediaAsset",
  "Contact",
  "ContactNote",
  "User",
  "AuthSession",
  "SiteSetting",
  "NavigationMenu",
  "UiTranslation",
  "AuditLogEntry",
];

export default function AdminAuditLogPage() {
  const { user } = useAuth();
  const action = useApiAction();

  const [actorId, setActorId] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityName, setEntityName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<AuditLogEntry | null>(null);

  const canReadUsers = !!user?.permissions.includes(PERMISSIONS.USER_READ);
  const canExport = !!user?.permissions.includes(PERMISSIONS.AUDIT_LOG_EXPORT);

  const filters = useFilters({
    actorId: actorId || undefined,
    action: actionFilter.trim() || undefined,
    entityName: entityName || undefined,
    from: toIsoBound(from, "start"),
    to: toIsoBound(to, "end"),
  });
  const list = useApiList<AuditLogEntry>("/admin/audit-logs", {
    pageSize: PAGE_SIZE,
    filters,
    keepPreviousData: true,
  });
  const staffList = useApiList<AdminUser>("/admin/users", { pageSize: 100, enabled: canReadUsers });

  async function exportCsv() {
    await action.run(
      async () => {
        const { blob, filename } = await auditLogApi.exportCsv({
          actorId: actorId || undefined,
          action: actionFilter.trim() || undefined,
          entityName: entityName || undefined,
          from: toIsoBound(from, "start"),
          to: toIsoBound(to, "end"),
          search: list.search.trim() || undefined,
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      },
      { successMessage: "Đã tải tệp CSV." },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhật ký hoạt động</h1>
          <p className="text-sm text-slate-500">
            Nhật ký chỉ đọc — bản ghi không thể chỉnh sửa hoặc xoá.
          </p>
        </div>
        {canExport && (
          <button
            type="button"
            onClick={() => void exportCsv()}
            disabled={action.pending}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-60"
          >
            {action.pending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Xuất CSV
          </button>
        )}
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="relative min-w-55 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <label htmlFor="auditSearch" className="sr-only">
              Tìm trong nhật ký
            </label>
            <Input
              id="auditSearch"
              type="search"
              placeholder="Tìm theo người thực hiện, hành động, đối tượng…"
              className="pl-9"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          {canReadUsers && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="auditActor" className="text-xs font-medium text-slate-500">
                Người thực hiện
              </label>
              <Select
                id="auditActor"
                className="w-44"
                value={actorId}
                onChange={(event) => setActorId(event.target.value)}
              >
                <option value="">Tất cả</option>
                {staffList.items.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auditAction" className="text-xs font-medium text-slate-500">
              Hành động
            </label>
            <Input
              id="auditAction"
              className="w-44"
              placeholder="post.updated"
              maxLength={100}
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auditEntity" className="text-xs font-medium text-slate-500">
              Đối tượng
            </label>
            <Select
              id="auditEntity"
              className="w-40"
              value={entityName}
              onChange={(event) => setEntityName(event.target.value)}
            >
              <option value="">Tất cả</option>
              {ENTITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auditFrom" className="text-xs font-medium text-slate-500">
              Từ ngày
            </label>
            <Input
              id="auditFrom"
              type="date"
              className="w-40"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auditTo" className="text-xs font-medium text-slate-500">
              Đến ngày
            </label>
            <Input
              id="auditTo"
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
          <TableSkeleton rows={8} columns={5} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bản ghi phù hợp"
            description="Thử mở rộng khoảng thời gian hoặc bỏ bớt bộ lọc."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th className="py-3 pr-4 font-medium">Thời gian</th>
                  <th className="py-3 pr-4 font-medium">Người thực hiện</th>
                  <th className="py-3 pr-4 font-medium">Hành động</th>
                  <th className="py-3 pr-4 font-medium">Đối tượng</th>
                  <th className="py-3 pr-4 font-medium">IP</th>
                  <th className="py-3 pr-4 text-right font-medium">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((entry) => (
                  <tr key={entry.id} className="text-slate-700">
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-500">
                      {formatDateTime(entry.occurredAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-slate-900">{entry.actorName ?? "Hệ thống"}</span>
                      {entry.actorRole && (
                        <span className="block text-xs text-slate-400">{entry.actorRole}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-slate-700">{describeAuditAction(entry.action)}</span>
                      <span className="block font-mono text-xs text-slate-400">{entry.action}</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {entry.entityName ?? "—"}
                      {entry.entityId && (
                        <span className="block font-mono text-xs break-all text-slate-400">
                          {entry.entityId}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">{entry.ipAddress ?? "—"}</td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => setDetail(entry)}
                        className="text-sm font-medium text-accent hover:underline focus:ring-2 focus:ring-accent/30 focus:outline-none"
                      >
                        Xem
                      </button>
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
          totalLabel={`Tổng: ${list.meta.total.toLocaleString("vi-VN")} bản ghi`}
          onChange={list.setPage}
          disabled={list.loading}
        />
      </Panel>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Chi tiết bản ghi"
        description={detail ? describeAuditAction(detail.action) : undefined}
      >
        {detail && (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Thời gian</dt>
              <dd className="text-slate-800">{formatDateTime(detail.occurredAt)}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Người thực hiện</dt>
              <dd className="text-slate-800">
                {detail.actorName ?? "Hệ thống"}
                {detail.actorRole ? ` (${detail.actorRole})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Mã hành động</dt>
              <dd className="font-mono text-slate-800">{detail.action}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Đối tượng</dt>
              <dd className="break-all text-slate-800">
                {detail.entityName ?? "—"} {detail.entityId ?? ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">IP</dt>
              <dd className="text-slate-800">{detail.ipAddress ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Mã trạng thái</dt>
              <dd className="text-slate-800">{detail.statusCode ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Trình duyệt</dt>
              <dd className="break-all text-slate-600">{detail.userAgent ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs tracking-wide text-slate-400 uppercase">Dữ liệu kèm theo</dt>
              <dd>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(detail.metadata ?? {}, null, 2)}
                </pre>
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
