"use client";

import { useState } from "react";
import { Panel, Field, Input, PrimaryButton, Toggle } from "@/components/admin/ui";
import { mockCompanySettings, mockCurrentAdmin } from "@/content/admin/mockSettings";

export default function AdminSettingsPage() {
  const [companyName, setCompanyName] = useState(mockCompanySettings.companyName);
  const [email, setEmail] = useState(mockCompanySettings.email);
  const [phone, setPhone] = useState(mockCompanySettings.phone);
  const [address, setAddress] = useState(mockCompanySettings.address);
  const [website, setWebsite] = useState(mockCompanySettings.website);
  const [companySaved, setCompanySaved] = useState(false);

  const [twoFactor, setTwoFactor] = useState(true);
  const [twoFactorSaved, setTwoFactorSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Company settings saved (mock)", { companyName, email, phone, address, website });
    setCompanySaved(true);
    setTimeout(() => setCompanySaved(false), 1800);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Password change submitted (mock)");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 1800);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Cài đặt chung</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Thông tin công ty">
          <form onSubmit={handleCompanySubmit} className="flex flex-col gap-4">
            <Field label="Tên công ty" htmlFor="companyName" required>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </Field>
            <Field label="Email" htmlFor="companyEmail" required>
              <Input id="companyEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Số điện thoại" htmlFor="companyPhone">
              <Input id="companyPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Địa chỉ" htmlFor="companyAddress">
              <Input id="companyAddress" value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label="Website" htmlFor="companyWebsite">
              <Input id="companyWebsite" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </Field>
            <PrimaryButton type="submit" className="w-fit">
              Lưu thay đổi
            </PrimaryButton>
            {companySaved && <p className="text-sm text-emerald-600">Đã lưu thông tin công ty (mock).</p>}
          </form>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Bảo mật tài khoản">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {mockCurrentAdmin.name} <span className="text-slate-400">({mockCurrentAdmin.role})</span>
                </p>
                <p className="text-sm text-slate-500">{mockCurrentAdmin.email}</p>
              </div>
              <Field label="Xác thực 2 lớp (2FA)">
                <Toggle
                  checked={twoFactor}
                  onChange={(v) => {
                    setTwoFactor(v);
                    setTwoFactorSaved(true);
                    console.log("2FA toggled (mock)", v);
                    setTimeout(() => setTwoFactorSaved(false), 1800);
                  }}
                  labelOn="Đã bật"
                  labelOff="Đã tắt"
                />
              </Field>
              {twoFactorSaved && <p className="text-sm text-emerald-600">Đã cập nhật cài đặt 2FA (mock).</p>}
            </div>
          </Panel>

          <Panel title="Đổi mật khẩu">
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <Field label="Mật khẩu hiện tại" htmlFor="currentPassword" required>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </Field>
              <Field label="Mật khẩu mới" htmlFor="newPassword" required>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </Field>
              <Field label="Xác nhận mật khẩu mới" htmlFor="confirmPassword" required>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Field>
              <PrimaryButton type="submit" className="w-fit">
                Cập nhật mật khẩu
              </PrimaryButton>
              {passwordSaved && <p className="text-sm text-emerald-600">Đã cập nhật mật khẩu (mock).</p>}
            </form>
          </Panel>
        </div>
      </div>
    </div>
  );
}
