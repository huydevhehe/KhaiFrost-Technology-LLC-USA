"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Lock, RotateCcw, Trash2, Unlock } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import {
  ErrorState,
  TableSkeleton,
  formatDateTime,
  useApiAction,
  useApiResource,
  useConfirm,
} from "@/components/admin/shared";
import { UserForm, type UserFormValues } from "@/components/admin/people/UserForm";
import { TemporaryPasswordDialog } from "@/components/admin/people/TemporaryPasswordDialog";
import { AccountStatusBadge, RoleBadge } from "@/components/admin/people/peopleUi";
import {
  assignableRoles,
  canManageUser,
  usersApi,
  type AdminUser,
  type StaffRole,
} from "@/lib/api/admin/users";
import { isApiError } from "@/lib/api/client";
import { getFieldErrors } from "@/lib/api/errorMessages";
import { PERMISSIONS } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";

export default function AdminUserEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { user } = useAuth();
  const confirm = useConfirm();

  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [temporary, setTemporary] = useState<{ password: string; name: string } | null>(null);

  const resource = useApiResource<AdminUser>(id ? `/admin/users/${id}` : null);
  const action = useApiAction({
    onError: (error) => {
      setServerErrors(getFieldErrors(error));
      setConflict(isApiError(error) && error.code === "VERSION_CONFLICT");
    },
  });

  const data = resource.data;
  const can = (permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) =>
    !!user?.permissions.includes(permission);
  const manageable = data ? canManageUser(user?.role, data.role) : false;
  const isSelf = data?.id === user?.id;
  const roles = assignableRoles(user?.role);
  // Keep the account's current role selectable even when this user may not assign it.
  const roleOptions: StaffRole[] =
    data && !roles.includes(data.role as StaffRole) ? [data.role as StaffRole, ...roles] : roles;

  function reload() {
    setConflict(false);
    setServerErrors({});
    resource.refetch();
  }

  async function handleSubmit(values: UserFormValues) {
    if (!data) return;
    setServerErrors({});
    setConflict(false);
    const updated = await action.run(
      () =>
        usersApi.update(data.id, {
          version: data.version,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          role: values.role,
        }),
      { successMessage: "Đã lưu thay đổi." },
    );
    if (updated) resource.setData(updated);
  }

  async function toggleLock() {
    if (!data) return;
    const locking = data.status === "active";
    const ok = await confirm({
      title: locking ? "Khoá tài khoản?" : "Mở khoá tài khoản?",
      message: locking
        ? `${data.fullName} sẽ bị đăng xuất khỏi mọi thiết bị và không thể đăng nhập.`
        : `${data.fullName} sẽ có thể đăng nhập trở lại.`,
      confirmLabel: locking ? "Khoá" : "Mở khoá",
      danger: locking,
    });
    if (!ok) return;
    const updated = await action.run(() => (locking ? usersApi.lock(data.id) : usersApi.unlock(data.id)), {
      successMessage: locking ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.",
    });
    if (updated) resource.setData(updated);
  }

  async function resetPassword() {
    if (!data) return;
    const ok = await confirm({
      title: "Đặt lại mật khẩu?",
      message: `Hệ thống sẽ tạo mật khẩu tạm mới cho ${data.fullName} và đăng xuất tài khoản khỏi mọi thiết bị. Mật khẩu chỉ hiển thị một lần.`,
      confirmLabel: "Đặt lại mật khẩu",
    });
    if (!ok) return;
    const result = await action.run(() => usersApi.resetPassword(data.id), {
      successMessage: "Đã tạo mật khẩu tạm mới.",
    });
    if (result) {
      resource.setData(result);
      if (result.temporaryPassword) {
        setTemporary({ password: result.temporaryPassword, name: result.fullName });
      }
    }
  }

  async function remove() {
    if (!data) return;
    const ok = await confirm({
      title: "Xoá tài khoản?",
      message: `Tài khoản ${data.fullName} sẽ bị xoá khỏi hệ thống (xoá mềm).`,
      confirmLabel: "Xoá",
      danger: true,
    });
    if (!ok) return;
    const done = await action.run(() => usersApi.remove(data.id), { successMessage: "Đã xoá tài khoản." });
    if (done !== undefined) router.push("/admin/users");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/users"
          className="mb-1 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-accent"
        >
          <ArrowLeft size={15} />
          Danh sách tài khoản
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {data ? data.fullName : "Chỉnh sửa tài khoản"}
        </h1>
        {data && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RoleBadge role={data.role} />
            <AccountStatusBadge status={data.status} />
            <span className="text-xs text-slate-400">{data.email}</span>
          </div>
        )}
      </div>

      {conflict && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Tài khoản này vừa được người khác chỉnh sửa. Hãy tải lại rồi lưu lại thay đổi của bạn.</span>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 font-medium text-amber-800 transition-colors hover:bg-amber-100 focus:ring-2 focus:ring-amber-300 focus:outline-none"
          >
            <RotateCcw size={14} />
            Tải lại
          </button>
        </div>
      )}

      {resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.refetch} retryLabel="Tải lại" />
      ) : resource.loading && !data ? (
        <Panel>
          <TableSkeleton rows={5} columns={2} />
        </Panel>
      ) : data ? (
        <UserForm
          key={`${data.id}-${data.version}`}
          mode="edit"
          initial={{
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            role: data.role as StaffRole,
          }}
          roles={roleOptions}
          pending={action.pending}
          serverErrors={serverErrors}
          readOnly={!manageable || !can(PERMISSIONS.USER_UPDATE)}
          readOnlyMessage={
            manageable
              ? "Bạn không có quyền chỉnh sửa tài khoản nội bộ."
              : "Bạn không thể quản lý tài khoản có vai trò này."
          }
          onSubmit={(values) => void handleSubmit(values)}
          onCancel={() => router.push("/admin/users")}
          aside={
            <>
              <Panel title="Thông tin tài khoản">
                <dl className="flex flex-col gap-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Ngày tạo</dt>
                    <dd className="text-slate-800">{formatDateTime(data.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Cập nhật</dt>
                    <dd className="text-slate-800">{formatDateTime(data.updatedAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Đăng nhập gần nhất</dt>
                    <dd className="text-slate-800">
                      {data.lastLoginAt ? formatDateTime(data.lastLoginAt) : "Chưa đăng nhập"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Mật khẩu tạm</dt>
                    <dd className="text-slate-800">
                      {data.mustChangePassword ? "Chưa được đổi" : "Đã đổi"}
                    </dd>
                  </div>
                </dl>
              </Panel>

              <Panel title="Thao tác tài khoản">
                <div className="flex flex-col gap-2">
                  {can(PERMISSIONS.USER_LOCK) && (
                    <button
                      type="button"
                      onClick={() => void toggleLock()}
                      disabled={!manageable || isSelf || action.pending}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
                    >
                      {data.status === "active" ? <Lock size={15} /> : <Unlock size={15} />}
                      {data.status === "active" ? "Khoá tài khoản" : "Mở khoá tài khoản"}
                    </button>
                  )}
                  {can(PERMISSIONS.USER_RESET_PASSWORD) && (
                    <button
                      type="button"
                      onClick={() => void resetPassword()}
                      disabled={!manageable || isSelf || action.pending}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-50"
                    >
                      <KeyRound size={15} />
                      Đặt lại mật khẩu
                    </button>
                  )}
                  {can(PERMISSIONS.USER_DELETE) && (
                    <button
                      type="button"
                      onClick={() => void remove()}
                      disabled={!manageable || isSelf || action.pending}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-200 focus:outline-none disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Xoá tài khoản
                    </button>
                  )}
                  {isSelf && (
                    <p className="text-xs text-slate-500">
                      Không thể khoá, đặt lại mật khẩu hay xoá tài khoản của chính bạn. Dùng trang{" "}
                      <Link href="/tai-khoan/doi-mat-khau" className="text-accent hover:underline">
                        đổi mật khẩu
                      </Link>{" "}
                      thay thế.
                    </p>
                  )}
                </div>
              </Panel>
            </>
          }
        />
      ) : null}

      <TemporaryPasswordDialog
        open={temporary !== null}
        password={temporary?.password ?? ""}
        userName={temporary?.name ?? ""}
        onClose={() => setTemporary(null)}
      />
    </div>
  );
}
