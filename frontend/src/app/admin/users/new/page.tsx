"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Panel, Field, Input, PrimaryButton, SecondaryButton, Toggle } from "@/components/admin/ui";
import { roleDescriptions, mockUsers, type UserRole } from "@/content/admin/mockUsers";

function UserFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");
  const existingUser = mockUsers.find((u) => u.id === editingId);
  const isEditing = Boolean(existingUser);

  const [fullName, setFullName] = useState(existingUser?.name ?? "");
  const [email, setEmail] = useState(existingUser?.email ?? "");
  const [role, setRole] = useState<UserRole>(existingUser?.role ?? "Staff");
  const [active, setActive] = useState(existingUser ? existingUser.status === "Active" : true);
  const [twoFactor, setTwoFactor] = useState(existingUser?.twoFactorEnabled ?? false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("User form submitted (mock)", {
      fullName,
      email,
      role,
      active,
      twoFactor,
      password: password ? "••••••" : undefined,
    });
    setSubmitted(true);
    setTimeout(() => router.push("/admin/users"), 900);
  }

  const roles: UserRole[] = ["Owner", "Admin", "Staff"];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">{isEditing ? "Chỉnh sửa người dùng" : "Thêm người dùng"}</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Thông tin cơ bản" className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <Field label="Họ và tên" htmlFor="fullName" required>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" required />
            </Field>
            <Field label="Email" htmlFor="userEmail" required>
              <Input id="userEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@khaifrost.com" required />
            </Field>

            <Field label="Bảo mật" htmlFor="password">
              <div />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Mật khẩu" htmlFor="password" required={!isEditing}>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Xác nhận mật khẩu" htmlFor="confirmPassword" required={!isEditing}>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            </div>

            <Field label="Xác thực 2 lớp (2FA)">
              <Toggle checked={twoFactor} onChange={setTwoFactor} labelOn="Đã bật" labelOff="Đã tắt" />
            </Field>
          </div>
        </Panel>

        <Panel title="Vai trò">
          <div className="flex flex-col gap-3">
            {roles.map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
                  role === r ? "border-accent bg-accent/5" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <input
                    type="radio"
                    name="role"
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="h-4 w-4 accent-accent"
                  />
                  {r}
                </span>
                <span className="pl-6 text-xs text-slate-500">{roleDescriptions[r]}</span>
              </label>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <Field label="Trạng thái">
              <Toggle checked={active} onChange={setActive} labelOn="Active" labelOff="Locked" />
            </Field>
          </div>
        </Panel>

        <div className="flex items-center gap-3 lg:col-span-3">
          <PrimaryButton type="submit">Lưu</PrimaryButton>
          <SecondaryButton onClick={() => router.push("/admin/users")}>Huỷ</SecondaryButton>
          {submitted && <span className="text-sm text-emerald-600">Đã lưu (mock) — đang quay lại danh sách...</span>}
        </div>
      </form>
    </div>
  );
}

export default function UserFormPage() {
  return (
    <Suspense fallback={null}>
      <UserFormContent />
    </Suspense>
  );
}
