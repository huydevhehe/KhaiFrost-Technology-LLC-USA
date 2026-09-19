"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Panel } from "@/components/admin/ui";
import { ActionButton, Alert, PasswordField, PasswordHints } from "@/components/account/ui";
import { accountApi } from "@/lib/api/account";
import { describeApiError, getFieldErrors } from "@/lib/api/errorMessages";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isPasswordValid } from "@/lib/auth/passwordPolicy";

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordForm />
    </Suspense>
  );
}

function ChangePasswordForm() {
  const params = useSearchParams();
  const required = params.get("bat-buoc") === "1";
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const canSubmit = current.length > 0 && isPasswordValid(next) && next === confirm && next !== current;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await accountApi.changePassword(current, next);
      setDone(true);
      await refreshUser();
      setTimeout(() => router.replace("/tai-khoan"), 1500);
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(describeApiError(err, "password"));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold text-slate-900">Đổi mật khẩu</h1>
      <p className="mt-1 text-sm text-slate-500">
        Sau khi đổi, các thiết bị khác sẽ bị đăng xuất. Phiên quản trị (nếu có) cần được xác nhận lại.
      </p>

      {required && (
        <div className="mt-5">
          <Alert tone="info">Vì lý do bảo mật, bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.</Alert>
        </div>
      )}

      <Panel className="mt-5">
        {done ? (
          <Alert tone="success">Đã đổi mật khẩu thành công. Đang chuyển về trang tài khoản...</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {error && <Alert>{error}</Alert>}
            <PasswordField
              id="current"
              label="Mật khẩu hiện tại"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              error={fieldErrors.currentPassword}
              required
            />
            <div className="flex flex-col gap-2">
              <PasswordField
                id="new"
                label="Mật khẩu mới"
                autoComplete="new-password"
                value={next}
                maxLength={128}
                onChange={(e) => setNext(e.target.value)}
                error={fieldErrors.newPassword}
                required
              />
              <PasswordHints password={next} />
            </div>
            <PasswordField
              id="confirm"
              label="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              value={confirm}
              maxLength={128}
              onChange={(e) => setConfirm(e.target.value)}
              error={confirm && confirm !== next ? "Mật khẩu nhập lại chưa khớp." : undefined}
              required
            />
            {current && next && next === current && (
              <p className="text-xs text-red-600">Mật khẩu mới phải khác mật khẩu hiện tại.</p>
            )}
            <ActionButton type="submit" loading={submitting} disabled={!canSubmit} className="w-full py-3">
              Đổi mật khẩu
            </ActionButton>
          </form>
        )}
      </Panel>
    </div>
  );
}
