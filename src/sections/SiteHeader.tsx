"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { navLinks } from "@/content/navLinks";

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between px-8 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900">
            K
          </span>
          <span className="text-sm font-semibold tracking-wide">
            KHAIFROST
          </span>
        </Link>
        <nav className="hidden items-center gap-2 text-base font-medium text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] md:flex">
          {navLinks.slice(0, 3).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-block rounded-lg px-3 py-1.5 transition-all duration-300 ease-out hover:tracking-wide hover:bg-white/10 hover:text-accent hover:backdrop-blur-sm"
            >
              {t(`nav.${link.key}`)}
            </Link>
          ))}
          <Link
            href="/demo"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white shadow-md drop-shadow-none transition-all duration-300 ease-out hover:scale-105 hover:bg-accent/90"
          >
            {t("nav.demo")}
          </Link>
          {navLinks.slice(3).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-block rounded-lg px-3 py-1.5 transition-all duration-300 ease-out hover:tracking-wide hover:bg-white/10 hover:text-accent hover:backdrop-blur-sm"
            >
              {t(`nav.${link.key}`)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <Button href="/contact" variant="primary-pill-light">
            {t("nav.getStarted")} →
          </Button>
        </div>
      </div>
    </header>
  );
}
