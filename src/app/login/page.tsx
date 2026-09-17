"use client";

import { useState } from "react";
import Image from "next/image";
import { Field, Input, PrimaryButton } from "@/components/admin/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleOtpChange(index: number, value: string) {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < otp.length - 1) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Login submitted (mock)", { email, password, otp: otp.join(""), rememberMe });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 bg-navy lg:block">
        <Image
          src="/images/admin/login-banner.png"
          alt="KhaiFrost Technology — Build Smarter. Grow Faster."
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white p-8 lg:w-1/2">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-slate-900">Đăng nhập vào hệ thống</h1>
          <p className="mt-1 text-sm text-slate-500">Truy cập tài khoản KhaiFrost Technology</p>

          <div className="mt-8 flex flex-col gap-4">
            <Field label="Email hoặc tên đăng nhập" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                placeholder="ban@khaifrost.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field label="Mật khẩu" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            <Field label="Mã xác thực (2FA)" hint="Nhập mã 6 số từ ứng dụng Google Authenticator.">
              <div className="flex gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    maxLength={1}
                    inputMode="numeric"
                    className="h-11 w-11 rounded-lg border border-slate-200 text-center text-lg font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                ))}
              </div>
            </Field>

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
              <button type="button" className="font-medium text-accent hover:underline">
                Quên mật khẩu?
              </button>
            </div>

            <PrimaryButton type="submit" className="mt-2 w-full justify-center py-3">
              Đăng nhập
            </PrimaryButton>

            {submitted && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-600">
                Đã gửi yêu cầu đăng nhập (mock) — xem console để biết chi tiết.
              </p>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-slate-400">© 2025 KhaiFrost Technology LLC</p>
        </form>
      </div>
    </div>
  );
}
