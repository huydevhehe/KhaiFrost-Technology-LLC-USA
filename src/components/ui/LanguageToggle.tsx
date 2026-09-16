"use client";

import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("vi") ? "vi" : "en";

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/25 p-1 text-xs font-semibold">
      <button
        type="button"
        onClick={() => i18n.changeLanguage("en")}
        aria-pressed={current === "en"}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          current === "en"
            ? "bg-white text-slate-900"
            : "text-white/70 hover:text-white"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("vi")}
        aria-pressed={current === "vi"}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          current === "vi"
            ? "bg-white text-slate-900"
            : "text-white/70 hover:text-white"
        }`}
      >
        VI
      </button>
    </div>
  );
}
