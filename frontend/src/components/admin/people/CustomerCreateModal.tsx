"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Field, Input, SecondaryButton } from "@/components/admin/ui";
import { Modal, useApiAction } from "@/components/admin/shared";
import { customersApi, type AdminCustomerWithTemporaryPassword } from "@/lib/api/admin/customers";
import { USER_LIMITS } from "@/lib/api/admin/users";
import { getFieldErrors } from "@/lib/api/errorMessages";
import { checkPassword, isPasswordValid } from "@/lib/auth/passwordPolicy";
import { FieldError } from "./peopleUi";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CustomerCreateModalProps {
  open: boolean;
  onClose: () => void;
  /** Called once the customer exists; the temporary password (if any) is on the result. */
  onCreated: (customer: AdminCustomerWithTemporaryPassword) => void;
}

function CustomerCreateForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (customer: AdminCustomerWithTemporaryPassword) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [manualPassword, setManualPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const action = useApiAction({ onError: (error) => setErrors(getFieldErrors(error)) });

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    if (!fullName.trim()) found.fullName = "Vui lòng nhập họ và tên.";
    else if (fullName.trim().length > USER_LIMITS.fullNameMax)
      found.fullName = `Họ và tên tối đa ${USER_LIMITS.fullNameMax} ký tự.`;
    if (!email.trim()) found.email = "Vui lòng nhập email.";
    else if (!EMAIL_PATTERN.test(email.trim())) found.email = "Email không hợp lệ.";
    const digits = phone.replace(/\D/g, "");
    if (!phone.trim()) found.phone = "Vui lòng nhập số điện thoại.";
    else if (digits.length < 8 || !/^[0-9+().\-\s]+$/.test(phone.trim()))
      found.phone = "Số điện thoại không hợp lệ (dùng số Việt Nam hoặc kèm mã quốc gia).";
    if (manualPassword && !isPasswordValid(password)) found.password = "Mật khẩu chưa đạt yêu cầu bên dưới.";
    return found;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (action.pending) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const created = await action.run(
      () =>
        customersApi.create({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password: manualPassword ? password : undefined,
        }),
      { successMessage: "Đã tạo khách hàng." },
    );
    if (created) onCreated(created);
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <Field label="Họ và tên" htmlFor="customerFullName" required>
        <Input
          id="customerFullName"
          value={fullName}
          maxLength={USER_LIMITS.fullNameMax}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Nguyễn Văn A"
          disabled={action.pending}
          aria-invalid={!!errors.fullName}
        />
        <FieldError message={errors.fullName} />
      </Field>

      <Field label="Email" htmlFor="customerEmail" required>
        <Input
          id="customerEmail"
          type="email"
          autoComplete="off"
          value={email}
          maxLength={USER_LIMITS.emailMax}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="khach@example.com"
          disabled={action.pending}
          aria-invalid={!!errors.email}
        />
        <FieldError message={errors.email} />
      </Field>

      <Field label="Số điện thoại" htmlFor="customerPhone" required>
        <Input
          id="customerPhone"
          type="tel"
          autoComplete="off"
          value={phone}
          maxLength={USER_LIMITS.phoneMax}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="0912345678"
          disabled={action.pending}
          aria-invalid={!!errors.phone}
        />
        <FieldError message={errors.phone} />
      </Field>

      <label className="flex items-start gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-accent"
          checked={manualPassword}
          onChange={(event) => setManualPassword(event.target.checked)}
          disabled={action.pending}
        />
        <span>
          Tự đặt mật khẩu
          <span className="block text-xs text-slate-500">
            Nếu không chọn, hệ thống tạo mật khẩu tạm và hiển thị một lần duy nhất; khách hàng phải đổi khi đăng
            nhập.
          </span>
        </span>
      </label>

      {manualPassword && (
        <Field label="Mật khẩu" htmlFor="customerPassword" required>
          <Input
            id="customerPassword"
            type="password"
            autoComplete="new-password"
            value={password}
            maxLength={USER_LIMITS.passwordMax}
            onChange={(event) => setPassword(event.target.value)}
            disabled={action.pending}
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

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={action.pending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-60"
        >
          {action.pending && <Loader2 size={15} className="animate-spin" />}
          Tạo khách hàng
        </button>
        <SecondaryButton onClick={onCancel}>Huỷ</SecondaryButton>
      </div>
    </form>
  );
}

/** Modal form that creates a customer account; the form remounts on every open so it starts empty. */
export function CustomerCreateModal({ open, onClose, onCreated }: CustomerCreateModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Tạo khách hàng" size="md">
      {open && <CustomerCreateForm onCancel={onClose} onCreated={onCreated} />}
    </Modal>
  );
}
