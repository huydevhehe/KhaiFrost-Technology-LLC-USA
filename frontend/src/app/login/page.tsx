"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/admin/ui";
import { ActionButton, Alert, AuthShell, PasswordField } from "@/components/account/ui";
import { describeApiError } from "@/lib/api/errorMessages";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRedirectWhenAuthenticated } from "@/lib/auth/useRedirectWhenAuthenticated";

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect after a successful login (or when already signed in).
  useRedirectWhenAuthenticated();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login({ identifier: identifier.trim(), password, rememberMe });
    } catch (err) {
      setError(describeApiError(err, "login"));
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-500">Truy cập tài khoản KhaiFrost Technology</p>

        <div className="mt-8 flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Email hoặc số điện thoại" htmlFor="identifier" required>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="ban@khaifrost.com hoặc 0912345678"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </Field>

          <PasswordField
            id="password"
            name="password"
            label="Mật khẩu"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-accent"
              />
              Ghi nhớ đăng nhập
            </label>
            <Link href="/quen-mat-khau" className="font-medium text-accent hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          <ActionButton
            type="submit"
            loading={submitting}
            disabled={!identifier.trim() || !password}
            className="mt-2 w-full py-3"
          >
            Đăng nhập
          </ActionButton>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Chưa có tài khoản?{" "}
          <Link href="/dang-ky" className="font-medium text-accent hover:underline">
            Đăng ký
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
