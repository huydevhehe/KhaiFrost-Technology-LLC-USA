"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LayoutDashboard, LogOut, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { initialsOf, isStaff } from "@/lib/auth/permissions";

/** Compact auth entry point for the public site header. */
export function AccountMenu() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (status === "loading") return <div className="h-9 w-9" aria-hidden />;

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Link href="/login" className="rounded-lg px-3 py-1.5 transition-colors hover:bg-white/10">
          Đăng nhập
        </Link>
        <Link
          href="/dang-ky"
          className="hidden rounded-lg px-3 py-1.5 transition-colors hover:bg-white/10 sm:inline-block"
        >
          Đăng ký
        </Link>
      </div>
    );
  }

  const itemClass = "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50";

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // The local session is cleared either way.
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold backdrop-blur">
          {initialsOf(user.fullName)}
        </span>
        <span className="hidden max-w-32 truncate lg:inline">{user.fullName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <Link href="/tai-khoan" onClick={() => setOpen(false)} className={itemClass}>
            <User size={15} />
            Tài khoản
          </Link>
          <Link href="/tai-khoan/yeu-thich" onClick={() => setOpen(false)} className={itemClass}>
            <Heart size={15} />
            Yêu thích
          </Link>
          <Link href="/tai-khoan/gio-hang" onClick={() => setOpen(false)} className={itemClass}>
            <ShoppingCart size={15} />
            Giỏ hàng
          </Link>
          {isStaff(user) && (
            <Link href="/admin" onClick={() => setOpen(false)} className={itemClass}>
              <LayoutDashboard size={15} />
              Trang quản trị
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className={`${itemClass} border-t border-slate-100 text-red-600 hover:bg-red-50`}
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
