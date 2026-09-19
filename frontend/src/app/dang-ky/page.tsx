"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/admin/ui";
import { ActionButton, Alert, AuthShell, FieldError, PasswordField, PasswordHints } from "@/components/account/ui";
import { describeApiError, getFieldErrors } from "@/lib/api/errorMessages";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isPasswordValid } from "@/lib/auth/passwordPolicy";
import { useRedirectWhenAuthenticated } from "@/lib/auth/useRedirectWhenAuthenticated";

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useRedirectWhenAuthenticated();

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    fullName.trim() && phone.trim() && email.trim() && isPasswordValid(password) && confirm === password;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !canSubmit) return;
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        preferredLocale: "vi",
      });
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(describeApiError(err, "register"));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="text-2xl font-bold text-slate-900">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-slate-500">Đăng ký để lưu sản phẩm yêu thích và giỏ hàng của bạn</p>

        <div className="mt-8 flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Họ và tên" htmlFor="fullName" required>
            <Input
              id="fullName"
              autoComplete="name"
              value={fullName}
              maxLength={150}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <FieldError message={fieldErrors.fullName} />
          </Field>

          <Field label="Số điện thoại" htmlFor="phone" required>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0912345678"
              value={phone}
              maxLength={32}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <FieldError message={fieldErrors.phone} />
          </Field>

          <Field label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ban@khaifrost.com"
              value={email}
              maxLength={254}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <FieldError message={fieldErrors.email} />
          </Field>

          <div className="flex flex-col gap-2">
            <PasswordField
              id="password"
              label="Mật khẩu"
              autoComplete="new-password"
              value={password}
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              required
            />
            <PasswordHints password={password} />
          </div>

          <PasswordField
            id="confirm"
            label="Nhập lại mật khẩu"
            autoComplete="new-password"
            value={confirm}
            maxLength={128}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? "Mật khẩu nhập lại chưa khớp." : undefined}
            required
          />

          <ActionButton type="submit" loading={submitting} disabled={!canSubmit} className="mt-2 w-full py-3">
            Đăng ký
          </ActionButton>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
