"use client";

import { useState } from "react";
import { Lock, Search, Trash2, Unlock } from "lucide-react";
import { IconButton, Input, Panel, Select } from "@/components/admin/ui";
import {
  EmptyState,
  ErrorState,
  LOCALE_LABELS,
  Modal,
  TableSkeleton,
  formatDate,
  formatDateTime,
  useApiAction,
  useApiList,
  useApiResource,
  useConfirm,
  useFilters,
} from "@/components/admin/shared";
import { Pager } from "@/components/admin/system/Pager";
import { AccountStatusBadge, InitialsAvatar } from "@/components/admin/people/peopleUi";
import { customersApi, type AdminCustomer } from "@/lib/api/admin/customers";
import { USER_STATUS_LABELS, type UserStatus } from "@/lib/api/admin/users";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 20;

export default function AdminCustomersPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const action = useApiAction();

  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters = useFilters({ status: statusFilter || undefined });
  const list = useApiList<AdminCustomer>("/admin/customers", {
    pageSize: PAGE_SIZE,
    filters,
    keepPreviousData: true,
  });
  const detail = useApiResource<AdminCustomer>(selectedId ? `/admin/customers/${selectedId}` : null);

  const can = (permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) =>
    !!user?.permissions.includes(permission);

  async function toggleLock(target: AdminCustomer) {
    const locking = target.status === "active";
    const ok = await confirm({
      title: locking ? "Khoá tài khoản khách hàng?" : "Mở khoá tài khoản khách hàng?",
      message: locking
        ? `${target.fullName} sẽ bị đăng xuất và không thể đăng nhập cho đến khi được mở khoá.`
        : `${target.fullName} sẽ có thể đăng nhập trở lại.`,
      confirmLabel: locking ? "Khoá" : "Mở khoá",
      danger: locking,
    });
    if (!ok) return;
    const updated = await action.run(
      () => (locking ? customersApi.lock(target.id) : customersApi.unlock(target.id)),
      {
        successMessage: locking ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.",
        onSuccess: list.refetch,
      },
    );
    if (updated) detail.setData(updated);
  }

  async function remove(target: AdminCustomer) {
    const ok = await confirm({
      title: "Xoá khách hàng?",
      message: `Tài khoản ${target.fullName} sẽ bị xoá khỏi hệ thống (xoá mềm) và không thể đăng nhập nữa.`,
      confirmLabel: "Xoá",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => customersApi.remove(target.id), {
      successMessage: "Đã xoá khách hàng.",
      onSuccess: list.refetch,
    });
    if (done !== undefined) setSelectedId(null);
  }

  const selected = detail.data;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Khách hàng</h1>
        <p className="text-sm text-slate-500">Tài khoản khách hàng đăng ký trên website.</p>
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-55 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <label htmlFor="customerSearch" className="sr-only">
              Tìm theo tên, email hoặc số điện thoại
            </label>
            <Input
              id="customerSearch"
              type="search"
              placeholder="Tìm theo tên, email hoặc số điện thoại…"
              className="pl-9"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <label htmlFor="customerStatus" className="sr-only">
            Lọc theo trạng thái
          </label>
          <Select
            id="customerStatus"
            className="w-44"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as UserStatus | "")}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">{USER_STATUS_LABELS.active}</option>
            <option value="locked">{USER_STATUS_LABELS.locked}</option>
          </Select>
        </div>

        {list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} retryLabel="Tải lại" />
        ) : list.loading && list.items.length === 0 ? (
          <TableSkeleton rows={6} columns={5} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="Chưa có khách hàng nào"
            description="Khách hàng sẽ xuất hiện ở đây sau khi đăng ký tài khoản trên website."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th className="py-3 pr-4 font-medium">Khách hàng</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Điện thoại</th>
                  <th className="py-3 pr-4 font-medium">Trạng thái</th>
                  <th className="py-3 pr-4 font-medium">Ngày đăng ký</th>
                  <th className="py-3 pr-4 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((item) => (
                  <tr key={item.id} className="text-slate-700">
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className="flex items-center gap-2.5 text-left focus:ring-2 focus:ring-accent/30 focus:outline-none"
                      >
                        <InitialsAvatar name={item.fullName} url={item.avatarUrl} />
                        <span className="font-medium text-slate-900 hover:text-accent">{item.fullName}</span>
                      </button>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{item.email}</td>
                    <td className="py-3 pr-4 text-slate-500">{item.phone}</td>
                    <td className="py-3 pr-4">
                      <AccountStatusBadge status={item.status} />
                    </td>
                    <td className="py-3 pr-4 text-slate-500">{formatDate(item.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {can(PERMISSIONS.CUSTOMER_LOCK) && (
                          <IconButton
                            title={item.status === "active" ? "Khoá tài khoản" : "Mở khoá"}
                            onClick={action.pending ? undefined : () => void toggleLock(item)}
                            className={action.pending ? "opacity-40" : ""}
                          >
                            {item.status === "active" ? <Lock size={15} /> : <Unlock size={15} />}
                          </IconButton>
                        )}
                        {can(PERMISSIONS.CUSTOMER_DELETE) && (
                          <IconButton
                            title="Xoá khách hàng"
                            onClick={action.pending ? undefined : () => void remove(item)}
                            className={
                              action.pending ? "opacity-40" : "hover:bg-red-50 hover:text-red-600"
                            }
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        )}
                      </div>
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
          totalLabel={`Tổng: ${list.meta.total.toLocaleString("vi-VN")} khách hàng`}
          onChange={list.setPage}
          disabled={list.loading}
        />
      </Panel>

      <Modal
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title="Chi tiết khách hàng"
        size="md"
      >
        {detail.error ? (
          <ErrorState error={detail.error} onRetry={detail.refetch} retryLabel="Tải lại" />
        ) : detail.loading && !selected ? (
          <TableSkeleton rows={4} columns={2} withHeader={false} />
        ) : selected ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <InitialsAvatar name={selected.fullName} url={selected.avatarUrl} />
              <div>
                <p className="font-semibold text-slate-900">{selected.fullName}</p>
                <AccountStatusBadge status={selected.status} />
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs tracking-wide text-slate-400 uppercase">Email</dt>
                <dd className="break-all text-slate-800">{selected.email}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-slate-400 uppercase">Điện thoại</dt>
                <dd className="text-slate-800">{selected.phone}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-slate-400 uppercase">Ngôn ngữ</dt>
                <dd className="text-slate-800">{LOCALE_LABELS[selected.preferredLocale]}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-slate-400 uppercase">Ngày đăng ký</dt>
                <dd className="text-slate-800">{formatDateTime(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wide text-slate-400 uppercase">Đăng nhập gần nhất</dt>
                <dd className="text-slate-800">
                  {selected.lastLoginAt ? formatDateTime(selected.lastLoginAt) : "Chưa đăng nhập"}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {can(PERMISSIONS.CUSTOMER_LOCK) && (
                <button
                  type="button"
                  onClick={() => void toggleLock(selected)}
                  disabled={action.pending}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
                >
                  {selected.status === "active" ? <Lock size={15} /> : <Unlock size={15} />}
                  {selected.status === "active" ? "Khoá tài khoản" : "Mở khoá tài khoản"}
                </button>
              )}
              {can(PERMISSIONS.CUSTOMER_DELETE) && (
                <button
                  type="button"
                  onClick={() => void remove(selected)}
                  disabled={action.pending}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Xoá khách hàng
                </button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
