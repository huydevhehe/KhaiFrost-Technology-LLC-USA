"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Lock, Pencil, Plus, Search, Trash2, Unlock } from "lucide-react";
import { IconButton, Input, Panel, PrimaryButton, Select } from "@/components/admin/ui";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
  formatDate,
  formatDateTime,
  useApiAction,
  useApiList,
  useConfirm,
  useFilters,
} from "@/components/admin/shared";
import { Pager } from "@/components/admin/system/Pager";
import { AccountStatusBadge, InitialsAvatar, RoleBadge } from "@/components/admin/people/peopleUi";
import { TemporaryPasswordDialog } from "@/components/admin/people/TemporaryPasswordDialog";
import {
  visibleRoles,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  canManageUser,
  usersApi,
  type AdminUser,
  type StaffRole,
  type UserStatus,
} from "@/lib/api/admin/users";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const action = useApiAction();

  const [roleFilter, setRoleFilter] = useState<StaffRole | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [temporary, setTemporary] = useState<{ password: string; name: string } | null>(null);

  const filters = useFilters({ role: roleFilter || undefined, status: statusFilter || undefined });
  const list = useApiList<AdminUser>("/admin/users", { pageSize: PAGE_SIZE, filters, keepPreviousData: true });

  const can = (permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) =>
    !!user?.permissions.includes(permission);
  const manages = (target: AdminUser) => canManageUser(user?.role, target.role);
  const isSelf = (target: AdminUser) => target.id === user?.id;

  async function toggleLock(target: AdminUser) {
    const locking = target.status === "active";
    const ok = await confirm({
      title: locking ? "Khoá tài khoản?" : "Mở khoá tài khoản?",
      message: locking
        ? `Tài khoản ${target.fullName} sẽ bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập cho đến khi được mở khoá.`
        : `Tài khoản ${target.fullName} sẽ có thể đăng nhập trở lại.`,
      confirmLabel: locking ? "Khoá" : "Mở khoá",
      danger: locking,
    });
    if (!ok) return;
    await action.run(() => (locking ? usersApi.lock(target.id) : usersApi.unlock(target.id)), {
      successMessage: locking ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.",
      onSuccess: list.refetch,
    });
  }

  async function resetPassword(target: AdminUser) {
    const ok = await confirm({
      title: "Đặt lại mật khẩu?",
      message: `Hệ thống sẽ tạo mật khẩu tạm mới cho ${target.fullName} và đăng xuất tài khoản này khỏi mọi thiết bị. Mật khẩu chỉ hiển thị một lần.`,
      confirmLabel: "Đặt lại mật khẩu",
    });
    if (!ok) return;
    const result = await action.run(() => usersApi.resetPassword(target.id), {
      successMessage: "Đã tạo mật khẩu tạm mới.",
      onSuccess: list.refetch,
    });
    if (result?.temporaryPassword) {
      setTemporary({ password: result.temporaryPassword, name: result.fullName });
    }
  }

  async function remove(target: AdminUser) {
    const ok = await confirm({
      title: "Xoá tài khoản?",
      message: `Tài khoản ${target.fullName} sẽ bị xoá khỏi hệ thống (xoá mềm) và không thể đăng nhập nữa.`,
      confirmLabel: "Xoá",
      danger: true,
    });
    if (!ok) return;
    await action.run(() => usersApi.remove(target.id), {
      successMessage: "Đã xoá tài khoản.",
      onSuccess: list.refetch,
    });
  }

  const total = list.meta.total;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tài khoản nội bộ</h1>
          <p className="text-sm text-slate-500">Quản lý nhân sự truy cập khu vực quản trị.</p>
        </div>
        {can(PERMISSIONS.USER_CREATE) && (
          <Link href="/admin/users/new">
            <PrimaryButton icon={<Plus size={16} />}>Thêm tài khoản</PrimaryButton>
          </Link>
        )}
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <label htmlFor="userSearch" className="sr-only">
              Tìm theo tên, email hoặc số điện thoại
            </label>
            <Input
              id="userSearch"
              type="search"
              placeholder="Tìm theo tên, email hoặc số điện thoại…"
              className="pl-9"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <label htmlFor="roleFilter" className="sr-only">
            Lọc theo vai trò
          </label>
          <Select
            id="roleFilter"
            className="w-44"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as StaffRole | "")}
          >
            <option value="">Tất cả vai trò</option>
            {visibleRoles(user?.role).map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
          <label htmlFor="statusFilter" className="sr-only">
            Lọc theo trạng thái
          </label>
          <Select
            id="statusFilter"
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
          <TableSkeleton rows={6} columns={6} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="Không tìm thấy tài khoản phù hợp"
            description="Thử đổi từ khoá tìm kiếm hoặc bỏ bớt bộ lọc."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs tracking-wide text-slate-400 uppercase">
                  <th className="py-3 pr-4 font-medium">Họ và tên</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Điện thoại</th>
                  <th className="py-3 pr-4 font-medium">Vai trò</th>
                  <th className="py-3 pr-4 font-medium">Trạng thái</th>
                  <th className="py-3 pr-4 font-medium">Đăng nhập gần nhất</th>
                  <th className="py-3 pr-4 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.items.map((item) => {
                  const manageable = manages(item);
                  const self = isSelf(item);
                  return (
                    <tr key={item.id} className="text-slate-700">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <InitialsAvatar name={item.fullName} url={item.avatarUrl} />
                          <span className="font-medium text-slate-900">
                            {item.fullName}
                            {self && <span className="ml-1.5 text-xs text-slate-400">(bạn)</span>}
                            {item.mustChangePassword && (
                              <span className="block text-xs text-amber-600">Chưa đổi mật khẩu tạm</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{item.email}</td>
                      <td className="py-3 pr-4 text-slate-500">{item.phone}</td>
                      <td className="py-3 pr-4">
                        <RoleBadge role={item.role} />
                      </td>
                      <td className="py-3 pr-4">
                        <AccountStatusBadge status={item.status} />
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : `Tạo ${formatDate(item.createdAt)}`}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          {can(PERMISSIONS.USER_UPDATE) && (
                            <Link
                              href={`/admin/users/${item.id}`}
                              aria-disabled={!manageable}
                              tabIndex={manageable ? undefined : -1}
                              className={manageable ? "" : "pointer-events-none opacity-40"}
                            >
                              <IconButton title="Chỉnh sửa">
                                <Pencil size={15} />
                              </IconButton>
                            </Link>
                          )}
                          {can(PERMISSIONS.USER_LOCK) && (
                            <IconButton
                              title={
                                self
                                  ? "Không thể khoá tài khoản của chính bạn"
                                  : item.status === "active"
                                    ? "Khoá tài khoản"
                                    : "Mở khoá"
                              }
                              onClick={
                                !manageable || self || action.pending ? undefined : () => void toggleLock(item)
                              }
                              className={!manageable || self || action.pending ? "opacity-40" : ""}
                            >
                              {item.status === "active" ? <Lock size={15} /> : <Unlock size={15} />}
                            </IconButton>
                          )}
                          {can(PERMISSIONS.USER_RESET_PASSWORD) && (
                            <IconButton
                              title={self ? "Dùng trang đổi mật khẩu của bạn" : "Đặt lại mật khẩu"}
                              onClick={
                                !manageable || self || action.pending ? undefined : () => void resetPassword(item)
                              }
                              className={!manageable || self || action.pending ? "opacity-40" : ""}
                            >
                              <KeyRound size={15} />
                            </IconButton>
                          )}
                          {can(PERMISSIONS.USER_DELETE) && (
                            <IconButton
                              title={self ? "Không thể xoá tài khoản của chính bạn" : "Xoá tài khoản"}
                              onClick={!manageable || self || action.pending ? undefined : () => void remove(item)}
                              className={
                                !manageable || self || action.pending
                                  ? "opacity-40"
                                  : "hover:bg-red-50 hover:text-red-600"
                              }
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pager
          page={list.page}
          totalPages={list.meta.totalPages}
          totalLabel={`Tổng: ${total.toLocaleString("vi-VN")} tài khoản`}
          onChange={list.setPage}
          disabled={list.loading}
        />
      </Panel>

      <TemporaryPasswordDialog
        open={temporary !== null}
        password={temporary?.password ?? ""}
        userName={temporary?.name ?? ""}
        onClose={() => setTemporary(null)}
      />
    </div>
  );
}
