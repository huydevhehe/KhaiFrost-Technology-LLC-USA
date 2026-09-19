"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { ActionButton, Alert, PasswordField } from "@/components/account/ui";
import { describeApiError } from "@/lib/api/errorMessages";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CHANGE_PASSWORD_REQUIRED_PATH, loginUrl, signOutIntent } from "@/lib/auth/redirect";
import { isStaff } from "@/lib/auth/permissions";

function AdminSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50" aria-busy="true" aria-label="Đang tải trang quản trị">
      <div className="hidden h-screen w-60 shrink-0 animate-pulse bg-navy/90 md:block" />
      <div className="flex min-h-screen flex-1 flex-col">
        <div className="h-16 shrink-0 animate-pulse border-b border-slate-200 bg-white" />
        <div className="flex-1 space-y-4 p-6">
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

function ElevationScreen() {
  const { elevate, user } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await elevate(password);
      setPassword("");
    } catch (err) {
      setError(describeApiError(err, "admin-session"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-50 px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <ShieldCheck size={24} />
        </span>
        <h1 className="mt-5 text-xl font-bold text-slate-900">Xác nhận mật khẩu để vào trang quản trị</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {user ? `Đang đăng nhập với ${user.email}. ` : ""}Vì lý do bảo mật, vui lòng nhập lại mật khẩu của bạn.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <PasswordField
            id="admin-password"
            label="Mật khẩu"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <ActionButton type="submit" loading={submitting} disabled={!password} className="w-full py-3">
            Xác nhận
          </ActionButton>
          <Link href="/tai-khoan" className="text-center text-sm font-medium text-slate-500 hover:text-slate-900">
            Huỷ, quay lại tài khoản
          </Link>
        </div>
      </form>
    </div>
  );
}

/**
 * Guards the whole /admin tree: login -> role check -> elevated admin session.
 * The shell stays mounted once entered, so an expired admin session only overlays the
 * password prompt and keeps unsaved page state.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { user, status, adminSessionActive } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [shellReady, setShellReady] = useState(false);

  if (adminSessionActive && !shellReady) setShellReady(true);

  const staff = isStaff(user);
  const mustChange = !!user?.mustChangePassword;

  useEffect(() => {
    if (status === "anonymous") {
      if (signOutIntent.active) return;
      const search = window.location.search;
      router.replace(loginUrl(`${pathname}${search}`));
    } else if (status === "authenticated" && !staff) {
      router.replace("/tai-khoan?notice=khong-co-quyen");
    } else if (status === "authenticated" && mustChange) {
      router.replace(CHANGE_PASSWORD_REQUIRED_PATH);
    }
  }, [status, staff, mustChange, pathname, router]);

  if (status !== "authenticated" || !staff || mustChange) return <AdminSkeleton />;

  return (
    <>
      {shellReady ? (
        <div className="flex min-h-screen bg-slate-50">
          <AdminSidebar />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <AdminTopbar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      ) : (
        <AdminSkeleton />
      )}
      {!adminSessionActive && <ElevationScreen />}
    </>
  );
}
