"use client";

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Circle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Field, Input } from "@/components/admin/ui";
import { checkPassword } from "@/lib/auth/passwordPolicy";

type AlertTone = "error" | "success" | "info";

const alertTones: Record<AlertTone, string> = {
  error: "bg-red-50 text-red-700 border-red-100",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  info: "bg-sky-50 text-sky-700 border-sky-100",
};

export function Alert({ tone = "error", children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3.5 py-2.5 text-sm ${alertTones[tone]}`}
    >
      {children}
    </div>
  );
}

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

const variantClasses: Record<NonNullable<SubmitButtonProps["variant"]>, string> = {
  primary: "bg-accent text-white hover:bg-accent/90",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
};

/** Button with a loading spinner; disabled while loading. */
export function ActionButton({
  loading,
  variant = "primary",
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  id: string;
  hint?: string;
  error?: string;
}

export function PasswordField({ label, id, hint, error, required, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} htmlFor={id} required={required} hint={hint}>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} required={required} className="pr-10" {...rest} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          tabIndex={-1}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </Field>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600">{message}</p>;
}

/** Live checklist of the password policy. */
export function PasswordHints({ password }: { password: string }) {
  const rules = checkPassword(password);
  return (
    <ul className="grid gap-1 text-xs" aria-label="Yêu cầu mật khẩu">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-1.5 ${rule.ok ? "text-emerald-600" : "text-slate-400"}`}
        >
          {rule.ok ? <Check size={13} /> : <Circle size={11} />}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

/** Split layout used by login / register / forgot password: banner on the left, form on the right. */
export function AuthShell({ children }: { children: ReactNode }) {
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
        <Link
          href="/"
          className="absolute left-6 top-6 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-white/20"
        >
          ← Về trang chủ
        </Link>
        <span className="absolute bottom-2 right-3 text-[10px] font-medium tracking-wide text-white/70">
          Developed by Nguyen Quoc Huy
        </span>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white px-6 py-10 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          {children}
          <p className="mt-8 text-center text-xs text-slate-400">© 2025 KhaiFrost Technology LLC</p>
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({ label = "Đang tải..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50" aria-busy="true">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <Loader2 size={18} className="animate-spin" />
        {label}
      </div>
    </div>
  );
}
