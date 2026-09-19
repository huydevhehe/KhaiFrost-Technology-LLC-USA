"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Field, Input, Panel, SecondaryButton } from "@/components/admin/ui";
import { checkPassword, isPasswordValid } from "@/lib/auth/passwordPolicy";
import {
  USER_LIMITS,
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
  type StaffRole,
} from "@/lib/api/admin/users";
import { FieldError } from "./peopleUi";

export type PasswordMode = "temporary" | "manual";

export interface UserFormValues {
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  passwordMode: PasswordMode;
  password: string;
}

export interface UserFormProps {
  mode: "create" | "edit";
  initial?: Partial<Pick<UserFormValues, "fullName" | "email" | "phone" | "role">>;
  /** Roles the signed-in user may assign. */
  roles: StaffRole[];
  pending: boolean;
  /** Per-field messages returned by the API (VALIDATION_FAILED). */
  serverErrors?: Record<string, string>;
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
  /** Extra panels rendered under the role card (e.g. account actions). */
  aside?: ReactNode;
  /** Blocks the form, e.g. when the account may not be managed by this user. */
  readOnly?: boolean;
  /** Keeps the fields editable but freezes the role, e.g. when editing your own account. */
  roleLocked?: boolean;
  readOnlyMessage?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: UserFormValues, mode: "create" | "edit"): Record<string, string> {
  const errors: Record<string, string> = {};
  const fullName = values.fullName.trim();
  if (!fullName) errors.fullName = "Vui lòng nhập họ và tên.";
  else if (fullName.length > USER_LIMITS.fullNameMax)
    errors.fullName = `Họ và tên tối đa ${USER_LIMITS.fullNameMax} ký tự.`;

  const email = values.email.trim();
  if (!email) errors.email = "Vui lòng nhập email.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Email không hợp lệ.";
  else if (email.length > USER_LIMITS.emailMax) errors.email = `Email tối đa ${USER_LIMITS.emailMax} ký tự.`;

  const phone = values.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "Vui lòng nhập số điện thoại.";
  else if (phone.length > USER_LIMITS.phoneMax) errors.phone = `Số điện thoại tối đa ${USER_LIMITS.phoneMax} ký tự.`;
  else if (digits.length < 8 || !/^[0-9+().\-\s]+$/.test(phone))
    errors.phone = "Số điện thoại không hợp lệ (dùng số Việt Nam hoặc kèm mã quốc gia).";

  if (mode === "create" && values.passwordMode === "manual" && !isPasswordValid(values.password)) {
    errors.password = "Mật khẩu chưa đạt yêu cầu bên dưới.";
  }
  return errors;
}

/** Shared create/edit form for a back office account. No 2FA fields: the API has none. */
export function UserForm({
  mode,
  initial,
  roles,
  pending,
  serverErrors,
  onSubmit,
  onCancel,
  aside,
  readOnly = false,
  roleLocked = false,
  readOnlyMessage,
}: UserFormProps) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [role, setRole] = useState<StaffRole>(initial?.role ?? roles[0] ?? "staff");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("temporary");
  const [password, setPassword] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const errors = { ...localErrors, ...(serverErrors ?? {}) };
  const disabled = pending || readOnly;
  const roleDisabled = disabled || roleLocked;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;
    const values: UserFormValues = { fullName, email, phone, role, passwordMode, password };
    const found = validate(values, mode);
    setLocalErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({
      ...values,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="Thông tin cơ bản" className="lg:col-span-2">
        <div className="flex flex-col gap-4">
          {readOnly && readOnlyMessage && (
            <p role="status" className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
              {readOnlyMessage}
            </p>
          )}

          <Field label="Họ và tên" htmlFor="fullName" required>
            <Input
              id="fullName"
              value={fullName}
              maxLength={USER_LIMITS.fullNameMax}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nguyễn Văn A"
              disabled={disabled}
              aria-invalid={!!errors.fullName}
              required
            />
            <FieldError message={errors.fullName} />
          </Field>

          <Field label="Email" htmlFor="userEmail" required>
            <Input
              id="userEmail"
              type="email"
              autoComplete="off"
              value={email}
              maxLength={USER_LIMITS.emailMax}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ten@khaifrost.com"
              disabled={disabled}
              aria-invalid={!!errors.email}
              required
            />
            <FieldError message={errors.email} />
          </Field>

          <Field
            label="Số điện thoại"
            htmlFor="userPhone"
            required
            hint="Số Việt Nam (0912345678) hoặc số quốc tế kèm mã quốc gia (+1...)."
          >
            <Input
              id="userPhone"
              type="tel"
              autoComplete="off"
              value={phone}
              maxLength={USER_LIMITS.phoneMax}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0912345678"
              disabled={disabled}
              aria-invalid={!!errors.phone}
              required
            />
            <FieldError message={errors.phone} />
          </Field>

          {mode === "create" && (
            <fieldset className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              <legend className="text-sm font-medium text-slate-700">Mật khẩu</legend>
              <label className="flex items-start gap-2.5 text-sm text-slate-700">
                <input
                  type="radio"
                  name="passwordMode"
                  className="mt-0.5 h-4 w-4 accent-accent"
                  checked={passwordMode === "temporary"}
                  onChange={() => setPasswordMode("temporary")}
                  disabled={disabled}
                />
                <span>
                  Tạo mật khẩu tạm
                  <span className="block text-xs text-slate-500">
                    Hệ thống sinh mật khẩu và hiển thị một lần duy nhất; người dùng phải đổi khi đăng nhập.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-sm text-slate-700">
                <input
                  type="radio"
                  name="passwordMode"
                  className="mt-0.5 h-4 w-4 accent-accent"
                  checked={passwordMode === "manual"}
                  onChange={() => setPasswordMode("manual")}
                  disabled={disabled}
                />
                <span>Tự đặt mật khẩu</span>
              </label>

              {passwordMode === "manual" && (
                <Field label="Mật khẩu" htmlFor="password" required>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    maxLength={USER_LIMITS.passwordMax}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={disabled}
                    aria-invalid={!!errors.password}
                  />
                  <FieldError message={errors.password} />
                  <ul className="mt-1.5 grid gap-1 text-xs" aria-label="Yêu cầu mật khẩu">
                    {checkPassword(password).map((rule) => (
                      <li key={rule.id} className={rule.ok ? "text-emerald-600" : "text-slate-500"}>
                        {rule.ok ? "✓" : "•"} {rule.label}
                      </li>
                    ))}
                  </ul>
                </Field>
              )}
            </fieldset>
          )}
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title="Vai trò">
          {roles.length === 0 ? (
            <p className="text-sm text-slate-500">Bạn không có quyền gán vai trò cho tài khoản nội bộ.</p>
          ) : roles.length === 1 ? (
            <p className="text-sm text-slate-600">
              {mode === "create" ? "Tài khoản sẽ được tạo với vai trò" : "Tài khoản có vai trò"} <strong>{USER_ROLE_LABELS[roles[0]]}</strong>. Bạn không có quyền gán vai trò khác.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {roles.map((item) => (
                <label
                  key={item}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
                    role === item ? "border-accent bg-accent/5" : "border-slate-200 hover:border-slate-300"
                  } ${roleDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <input
                      type="radio"
                      name="role"
                      className="h-4 w-4 accent-accent"
                      checked={role === item}
                      onChange={() => setRole(item)}
                      disabled={roleDisabled}
                    />
                    {USER_ROLE_LABELS[item]}
                  </span>
                  <span className="pl-6 text-xs text-slate-500">{USER_ROLE_DESCRIPTIONS[item]}</span>
                </label>
              ))}
              {roleLocked && (
                <p className="text-xs text-slate-500">
                  Bạn không thể tự đổi vai trò của chính mình.
                </p>
              )}
              <FieldError message={errors.role} />
            </div>
          )}
        </Panel>
        {aside}
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:col-span-3">
        <button
          type="submit"
          disabled={disabled || roles.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-60"
        >
          {pending && <Loader2 size={15} className="animate-spin" />}
          {mode === "create" ? "Tạo tài khoản" : "Lưu thay đổi"}
        </button>
        <SecondaryButton onClick={onCancel}>Huỷ</SecondaryButton>
      </div>
    </form>
  );
}
