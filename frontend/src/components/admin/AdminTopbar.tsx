"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Home,
  Loader2,
  Lock,
  LogOut,
  Search,
  User,
} from "lucide-react";
import { notificationsApi } from "@/lib/api/admin/notifications";
import { searchApi } from "@/lib/api/admin/search";
import { isApiError } from "@/lib/api/client";
import type { AdminNotification, AdminSearchResult, AdminSearchType } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { initialsOf, roleLabel } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";

const UNREAD_POLL_MS = 60_000;
const SEARCH_DEBOUNCE_MS = 300;

const SEARCH_GROUP_LABELS: Record<AdminSearchType, string> = {
  posts: "Bài viết",
  products: "Sản phẩm",
  projects: "Dự án",
  services: "Dịch vụ",
  testimonials: "Đánh giá",
  contacts: "Liên hệ",
  users: "Nhân sự",
  customers: "Khách hàng",
  pages: "Trang",
  media: "Thư viện",
};

/** Closes the popover when clicking outside of `ref` or pressing Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);
  return ref;
}

function Popover({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function AdminSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const containerRef = useDismiss(open, () => setOpen(false));

  useEffect(() => {
    const term = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setResults([]);
        setLoading(false);
        setFailed(false);
        return;
      }
      setLoading(true);
      try {
        const response = await searchApi.search({ q: term, limit: 5 }, controller.signal);
        setResults(response.results);
        setFailed(false);
      } catch (error) {
        if (isApiError(error) && error.code === "ABORTED") return;
        setResults([]);
        setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const groups = useMemo(() => {
    const map = new Map<AdminSearchType, AdminSearchResult[]>();
    for (const result of results) {
      const bucket = map.get(result.type);
      if (bucket) bucket.push(result);
      else map.set(result.type, [result]);
    }
    return Array.from(map.entries());
  }, [results]);

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-80 max-w-full">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Tìm kiếm..."
        aria-label="Tìm kiếm trong trang quản trị"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-700 outline-none transition-colors focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
      />
      {loading && (
        <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
      )}

      {showPanel && (
        <Popover className="max-h-96 w-96 overflow-y-auto">
          {failed && <p className="px-4 py-3 text-sm text-slate-500">Không tìm kiếm được. Vui lòng thử lại.</p>}
          {!failed && !loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">Không có kết quả phù hợp.</p>
          )}
          {groups.map(([type, items]) => (
            <div key={type} className="border-b border-slate-100 last:border-b-0">
              <p className="bg-slate-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {SEARCH_GROUP_LABELS[type] ?? type}
              </p>
              <ul>
                {items.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <Link
                      href={item.url}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-2.5 hover:bg-slate-50"
                    >
                      <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                      {item.subtitle && <p className="truncate text-xs text-slate-400">{item.subtitle}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Popover>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AdminNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useDismiss(open, () => setOpen(false));

  const loadUnread = useCallback(async () => {
    try {
      setUnread(await notificationsApi.unreadCount());
    } catch {
      // Silent: the bell just keeps its previous count.
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadUnread();
    })();
    const timer = setInterval(() => void loadUnread(), UNREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [loadUnread]);

  const loadList = useCallback(async () => {
    setError(null);
    try {
      const page = await notificationsApi.list({ pageSize: 10 });
      setItems(page.items);
      setUnread(page.meta.unreadCount);
    } catch {
      setError("Không tải được thông báo.");
      setItems([]);
    }
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void loadList();
  }

  async function markRead(notification: AdminNotification) {
    if (notification.isRead) return;
    setItems((current) =>
      current?.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)) ?? current,
    );
    setUnread((count) => Math.max(0, count - 1));
    try {
      await notificationsApi.markRead(notification.id);
    } catch {
      void loadList();
    }
  }

  async function markAllRead() {
    setItems((current) => current?.map((item) => ({ ...item, isRead: true })) ?? current);
    setUnread(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      void loadList();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Thông báo (${unread} chưa đọc)` : "Thông báo"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <Popover className="w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-800">Thông báo</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
            >
              <CheckCheck size={14} />
              Đánh dấu đã đọc tất cả
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!items && <p className="px-4 py-6 text-center text-sm text-slate-400">Đang tải...</p>}
            {error && <p className="px-4 py-6 text-center text-sm text-slate-500">{error}</p>}
            {items && !error && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Chưa có thông báo nào.</p>
            )}
            {items?.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void markRead(item)}
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${
                  item.isRead ? "" : "bg-accent/5"
                }`}
              >
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {!item.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  <span className="truncate">{item.title}</span>
                </p>
                {item.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>}
                <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</p>
              </button>
            ))}
          </div>
        </Popover>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User menu
// ---------------------------------------------------------------------------

function UserMenu() {
  const { user, logout, dropAdminSession } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useDismiss(open, () => setOpen(false));

  if (!user) return null;

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
    } catch {
      // The local session is cleared either way.
    }
    router.replace("/");
  }

  async function handleLockAdmin() {
    setBusy(true);
    try {
      await dropAdminSession();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const itemClass =
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-slate-100"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
          {initialsOf(user.fullName)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-slate-900">{user.fullName}</span>
          <span className="block text-xs leading-tight text-slate-400">{roleLabel(user.role)}</span>
        </span>
      </button>

      {open && (
        <Popover className="w-60">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-medium text-slate-900">{user.fullName}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <Link href="/tai-khoan" onClick={() => setOpen(false)} className={itemClass}>
            <User size={15} />
            Tài khoản của tôi
          </Link>
          <Link href="/" onClick={() => setOpen(false)} className={itemClass}>
            <Home size={15} />
            Về trang chủ
          </Link>
          <button type="button" onClick={handleLockAdmin} disabled={busy} className={itemClass}>
            <Lock size={15} />
            Khoá phiên quản trị
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            className={`${itemClass} border-t border-slate-100 text-red-600 hover:bg-red-50`}
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </Popover>
      )}
    </div>
  );
}

export function AdminTopbar() {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6">
      <AdminSearch />
      <div className="flex items-center gap-3">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
