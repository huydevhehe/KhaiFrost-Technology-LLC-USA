"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SocialIcons } from "@/components/ui/SocialIcons";

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-navy py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900">
            K
          </span>
          <span className="text-sm font-semibold">KHAIFROST</span>
        </div>
        <p className="text-xs text-white/50">{t("footer.copyright")}</p>
        <div className="flex items-center gap-4 text-xs text-white/50">
          <Link href="#">{t("footer.privacy")}</Link>
          <Link href="#">{t("footer.terms")}</Link>
          <SocialIcons />
        </div>
      </div>
    </footer>
  );
}
