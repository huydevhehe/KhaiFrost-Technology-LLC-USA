"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Heart, KeyRound, LayoutDashboard, LogOut, Monitor, ShoppingCart, Trash2 } from "lucide-react";
import { Field, Input, Panel, Select } from "@/components/admin/ui";
import { ActionButton, Alert, FieldError } from "@/components/account/ui";
import { accountApi } from "@/lib/api/account";
import { authApi } from "@/lib/api/auth";
import { describeApiError, getFieldErrors } from "@/lib/api/errorMessages";
import type { Locale, Profile, SessionSummary } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { initialsOf, isStaff, roleLabel } from "@/lib/auth/permissions";
import { describeUserAgent, formatDateTime } from "@/lib/format";

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const { user, logout, logoutAll, refreshUser } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const noAdminAccess = params.get("notice") === "khong-co-quyen";

  const [signingOut, setSigningOut] = useState<"one" | "all" | null>(null);

  async function handleLogout(all: boolean) {
    setSigningOut(all ? "all" : "one");
    try {
      await (all ? logoutAll() : logout());
    } catch {
      // The local session is cleared either way.
    }
    router.replace("/");
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      {noAdminAccess && <Alert tone="info">Bạn không có quyền truy cập trang quản trị.</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-semibold text-white">
            {initialsOf(user.fullName)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{user.fullName}</h1>
            <p className="text-sm text-slate-500">
              {user.email} · {roleLabel(user.role)}
            </p>
          </div>
        </div>
        {isStaff(user) && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent/90"
          >
            <LayoutDashboard size={17} />
            Trang quản trị
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLink href="/tai-khoan/doi-mat-khau" icon={<KeyRound size={18} />} label="Đổi mật khẩu" />
        <QuickLink href="/tai-khoan/yeu-thich" icon={<Heart size={18} />} label="Sản phẩm yêu thích" />
        <QuickLink href="/tai-khoan/gio-hang" icon={<ShoppingCart size={18} />} label="Giỏ hàng của tôi" />
      </div>

      <ProfilePanel onSaved={refreshUser} />
      <SessionsPanel />

      <Panel title="Đăng xuất">
        <div className="flex flex-wrap gap-3">
          <ActionButton variant="secondary" loading={signingOut === "one"} disabled={signingOut !== null} onClick={() => handleLogout(false)}>
            <LogOut size={15} />
            Đăng xuất
          </ActionButton>
          <ActionButton variant="danger" loading={signingOut === "all"} disabled={signingOut !== null} onClick={() => handleLogout(true)}>
            <LogOut size={15} />
            Đăng xuất khỏi mọi thiết bị
          </ActionButton>
        </div>
      </Panel>

      {!isStaff(user) && <DeleteAccountPanel />}
    </div>
  );
}

function DeleteAccountPanel() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (submitting || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await accountApi.deleteAccount(password);
      await refreshUser();
      router.replace("/");
    } catch (err) {
      setError(describeApiError(err));
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Vùng nguy hiểm">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Xoá tài khoản</p>
            <p className="mt-1 text-sm text-slate-500">
              Xoá vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan. Không thể hoàn tác.
            </p>
          </div>
          <ActionButton variant="danger" onClick={() => setOpen(true)}>
            <AlertTriangle size={15} />
            Xoá tài khoản
          </ActionButton>
        </div>
      ) : (
        <form onSubmit={handleDelete} className="flex flex-col gap-4" noValidate>
          {error && <Alert>{error}</Alert>}
          <Alert tone="info">Nhập mật khẩu hiện tại để xác nhận xoá vĩnh viễn tài khoản này.</Alert>
          <Field label="Mật khẩu hiện tại" htmlFor="delete-account-password" required>
            <Input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <div className="flex gap-3">
            <ActionButton type="submit" variant="danger" loading={submitting} disabled={!password}>
              Xác nhận xoá vĩnh viễn
            </ActionButton>
            <ActionButton
              variant="secondary"
              disabled={submitting}
              onClick={() => {
                setOpen(false);
                setPassword("");
                setError(null);
              }}
            >
              Huỷ
            </ActionButton>
          </div>
        </form>
      )}
    </Panel>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-accent hover:text-accent"
    >
      <span className="text-accent">{icon}</span>
      {label}
    </Link>
  );
}

function ProfilePanel({ onSaved }: { onSaved: () => Promise<unknown> }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [locale, setLocale] = useState<Locale>("vi");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    accountApi
      .getProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describeApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function startEdit() {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone);
    setLocale(profile.preferredLocale);
    setError(null);
    setFieldErrors({});
    setSaved(false);
    setEditing(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const updated = await accountApi.updateProfile({ fullName: fullName.trim(), phone: phone.trim(), preferredLocale: locale });
      setProfile(updated);
      setEditing(false);
      setSaved(true);
      await onSaved();
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Thông tin cá nhân"
      action={
        profile && !editing ? (
          <button type="button" onClick={startEdit} className="text-sm font-medium text-accent hover:underline">
            Chỉnh sửa
          </button>
        ) : undefined
      }
    >
      {loadError && <Alert>{loadError}</Alert>}
      {!profile && !loadError && <p className="text-sm text-slate-400">Đang tải...</p>}
      {saved && !editing && (
        <div className="mb-4">
          <Alert tone="success">Đã cập nhật thông tin.</Alert>
        </div>
      )}

      {profile && !editing && (
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <ProfileRow label="Họ và tên" value={profile.fullName} />
          <ProfileRow label="Email" value={profile.email} />
          <ProfileRow label="Số điện thoại" value={profile.phone} />
          <ProfileRow label="Ngôn ngữ email" value={profile.preferredLocale === "vi" ? "Tiếng Việt" : "English"} />
          <ProfileRow label="Đăng nhập gần nhất" value={formatDateTime(profile.lastLoginAt)} />
          <ProfileRow label="Ngày tạo tài khoản" value={formatDateTime(profile.createdAt)} />
        </dl>
      )}

      {profile && editing && (
        <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2" noValidate>
          {error && (
            <div className="sm:col-span-2">
              <Alert>{error}</Alert>
            </div>
          )}
          <Field label="Họ và tên" htmlFor="pf-name" required>
            <Input id="pf-name" value={fullName} maxLength={150} onChange={(e) => setFullName(e.target.value)} required />
            <FieldError message={fieldErrors.fullName} />
          </Field>
          <Field label="Số điện thoại" htmlFor="pf-phone" required>
            <Input id="pf-phone" type="tel" value={phone} maxLength={32} onChange={(e) => setPhone(e.target.value)} required />
            <FieldError message={fieldErrors.phone} />
          </Field>
          <Field label="Email" htmlFor="pf-email" hint="Email chưa thể thay đổi.">
            <Input id="pf-email" value={profile.email} disabled readOnly />
          </Field>
          <Field label="Ngôn ngữ email" htmlFor="pf-locale">
            <Select id="pf-locale" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </Select>
          </Field>
          <div className="flex gap-3 sm:col-span-2">
            <ActionButton type="submit" loading={saving} disabled={!fullName.trim() || !phone.trim()}>
              Lưu thay đổi
            </ActionButton>
            <ActionButton variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
              Huỷ
            </ActionButton>
          </div>
        </form>
      )}
    </Panel>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function SessionsPanel() {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const router = useRouter();
  const { refreshUser } = useAuth();

  const load = useCallback(async () => {
    try {
      setSessions(await authApi.sessions());
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function revoke(session: SessionSummary) {
    setRevoking(session.id);
    try {
      await authApi.revokeSession(session.id);
      if (session.current) {
        await refreshUser();
        router.replace("/login");
        return;
      }
      await load();
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Panel title="Phiên đăng nhập đang hoạt động">
      {error && <Alert>{error}</Alert>}
      {!sessions && !error && <p className="text-sm text-slate-400">Đang tải...</p>}
      {sessions && sessions.length === 0 && <p className="text-sm text-slate-500">Không có phiên nào.</p>}
      {sessions && sessions.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                <Monitor size={18} className="mt-0.5 text-slate-400" />
                <div className="text-sm">
                  <p className="font-medium text-slate-900">
                    {describeUserAgent(s.userAgent)}
                    {s.current && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        Thiết bị này
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {s.ipAddress ?? "IP không rõ"} · Hoạt động {formatDateTime(s.lastUsedAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => revoke(s)}
                disabled={revoking === s.id}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Thu hồi
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
