"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, KeyRound, LayoutDashboard, ShoppingCart, User } from "lucide-react";
import { PageSkeleton } from "@/components/account/ui";
import { CHANGE_PASSWORD_REQUIRED_PATH } from "@/lib/auth/redirect";
import { isStaff } from "@/lib/auth/permissions";
import { useRequireAuth } from "@/lib/auth/useRequireAuth";

const tabs = [
  { href: "/tai-khoan", label: "Tài khoản", icon: User },
  { href: "/tai-khoan/yeu-thich", label: "Yêu thích", icon: Heart },
  { href: "/tai-khoan/gio-hang", label: "Giỏ hàng", icon: ShoppingCart },
  { href: "/tai-khoan/doi-mat-khau", label: "Đổi mật khẩu", icon: KeyRound },
];

export default function CustomerAreaLayout({ children }: { children: ReactNode }) {
  const { user, status } = useRequireAuth();
  const pathname = usePathname();
  const router = useRouter();

  const onPasswordPage = pathname.startsWith("/tai-khoan/doi-mat-khau");
  const mustChange = !!user?.mustChangePassword;

  useEffect(() => {
    if (mustChange && !onPasswordPage) router.replace(CHANGE_PASSWORD_REQUIRED_PATH);
  }, [mustChange, onPasswordPage, router]);

  if (status !== "authenticated" || !user || (mustChange && !onPasswordPage)) return <PageSkeleton />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
              K
            </span>
            <span className="text-sm font-semibold tracking-wide">KHAIFROST</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {isStaff(user) && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg bg-navy px-3.5 py-2 font-medium text-white hover:bg-navy/90"
              >
                <LayoutDashboard size={15} />
                Trang quản trị
              </Link>
            )}
            <Link href="/" className="font-medium text-slate-500 hover:text-slate-900">
              Về trang chủ
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Khu vực tài khoản">
          {tabs.map((tab) => {
            const active = tab.href === "/tai-khoan" ? pathname === "/tai-khoan" : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent text-accent"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
