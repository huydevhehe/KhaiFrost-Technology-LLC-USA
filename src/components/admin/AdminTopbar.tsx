"use client";

import { Bell, Search } from "lucide-react";
import { mockCurrentAdmin } from "@/content/admin/mockSettings";

export function AdminTopbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="relative w-80 max-w-full">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          placeholder="Tìm kiếm..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          title="Thông báo"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
            {mockCurrentAdmin.avatarInitials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight text-slate-900">{mockCurrentAdmin.name}</p>
            <p className="text-xs leading-tight text-slate-400">{mockCurrentAdmin.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
