"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/admin/ui";
import { ActionButton, Alert, AuthShell, PasswordField, PasswordHints } from "@/components/account/ui";
import { authApi } from "@/lib/api/auth";
import { describeApiError } from "@/lib/api/errorMessages";
import { isPasswordValid } from "@/lib/auth/passwordPolicy";

type Step = "request" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setNotice("Nếu email tồn tại trong hệ thống, chúng tôi đã gửi mã xác nhận gồm 6 chữ số. Mã có hiệu lực trong thời gian ngắn.");
      setStep("reset");
    } catch (err) {
      setError(describeApiError(err, "reset"));
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword({
        identifier: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });
      setStep("done");
    } catch (err) {
      setError(describeApiError(err, "reset"));
    } finally {
      setSubmitting(false);
    }
  }

  const canReset = /^\d{6}$/.test(code.trim()) && isPasswordValid(newPassword) && newPassword === confirm;

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-slate-900">Quên mật khẩu</h1>

      {step === "request" && (
        <form onSubmit={requestCode} noValidate>
          <p className="mt-1 text-sm text-slate-500">Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu.</p>
          <div className="mt-8 flex flex-col gap-4">
            {error && <Alert>{error}</Alert>}
            <Field label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ban@khaifrost.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <ActionButton type="submit" loading={submitting} disabled={!email.trim()} className="mt-2 w-full py-3">
              Gửi mã xác nhận
            </ActionButton>
          </div>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={resetPassword} noValidate>
          <div className="mt-6 flex flex-col gap-4">
            {notice && <Alert tone="info">{notice}</Alert>}
            {error && <Alert>{error}</Alert>}

            <Field label="Mã xác nhận (6 chữ số)" htmlFor="code" required>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
            </Field>

            <div className="flex flex-col gap-2">
              <PasswordField
                id="newPassword"
                label="Mật khẩu mới"
                autoComplete="new-password"
                value={newPassword}
                maxLength={128}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <PasswordHints password={newPassword} />
            </div>

            <PasswordField
              id="confirm"
              label="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              value={confirm}
              maxLength={128}
              onChange={(e) => setConfirm(e.target.value)}
              error={confirm && confirm !== newPassword ? "Mật khẩu nhập lại chưa khớp." : undefined}
              required
            />

            <ActionButton type="submit" loading={submitting} disabled={!canReset} className="mt-2 w-full py-3">
              Đặt lại mật khẩu
            </ActionButton>
            <button
              type="button"
              onClick={() => {
                setStep("request");
                setError(null);
                setNotice(null);
              }}
              className="text-sm font-medium text-accent hover:underline"
            >
              Gửi lại mã / đổi email
            </button>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="mt-6 flex flex-col gap-4">
          <Alert tone="success">
            Mật khẩu đã được đặt lại. Các phiên đăng nhập cũ đã bị đăng xuất, hãy đăng nhập lại bằng mật khẩu mới.
          </Alert>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent/90"
          >
            Về trang đăng nhập
          </Link>
        </div>
      )}

      {step !== "done" && (
        <p className="mt-6 text-center text-sm text-slate-500">
          Đã nhớ mật khẩu?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Đăng nhập
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
