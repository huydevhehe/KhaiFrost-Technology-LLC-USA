"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * "header" (default): light-on-dark, hidden below md, sits over the hero image.
 * "panel": dark-on-light, always visible, full width — used inside the mobile menu panel.
 */
export function SearchBar({ variant = "header" }: { variant?: "header" | "panel" }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    router.push(`/tim-kiem?q=${encodeURIComponent(value)}`);
  }

  if (variant === "panel") {
    return (
      <form onSubmit={handleSubmit} className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("nav.searchPlaceholder", "Tìm kiếm...")}
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none"
        />
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative hidden md:block">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
      />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("nav.searchPlaceholder", "Tìm kiếm...")}
        className="w-40 rounded-full border border-white/25 bg-white/10 py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-white/60 backdrop-blur transition-all duration-300 ease-out focus:w-56 focus:border-white/50 focus:bg-white/15 focus:outline-none"
      />
    </form>
  );
}
