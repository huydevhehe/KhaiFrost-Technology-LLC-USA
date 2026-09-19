"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AccountMenu } from "@/components/account/AccountMenu";
import { Button } from "@/components/ui/Button";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useHeaderLinks, useSiteConfig } from "@/lib/content/site";

export function SiteHeader() {
  const { t } = useTranslation();
  const links = useHeaderLinks();
  const { logoDarkUrl, logoUrl } = useSiteConfig();
  const logo = logoDarkUrl ?? logoUrl;

  return (
    <header
      className="absolute inset-x-0 top-0 z-50"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex max-w-[1800px] items-center justify-between px-8 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-2 text-white">
          {logo ? (
            <span className="relative block h-8 w-36">
              <Image src={logo} alt="KhaiFrost" fill sizes="144px" className="object-contain object-left" />
            </span>
          ) : (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900">
                K
              </span>
              <span className="text-sm font-semibold tracking-wide">
                KHAIFROST
              </span>
            </>
          )}
        </Link>
        <nav className="hidden items-center gap-2 text-base font-medium text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] md:flex">
          {links.slice(0, 3).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.newTab ? "_blank" : undefined}
              transitionTypes={["nav-forward"]}
              className="inline-block rounded-lg px-3 py-1.5 transition-all duration-300 ease-out hover:tracking-wide hover:bg-white/10 hover:text-accent hover:backdrop-blur-sm"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/demo"
            transitionTypes={["nav-forward"]}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white shadow-md drop-shadow-none transition-all duration-300 ease-out hover:scale-105 hover:bg-accent/90"
          >
            {t("nav.demo")}
          </Link>
          {links.slice(3).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.newTab ? "_blank" : undefined}
              transitionTypes={["nav-forward"]}
              className="inline-block rounded-lg px-3 py-1.5 transition-all duration-300 ease-out hover:tracking-wide hover:bg-white/10 hover:text-accent hover:backdrop-blur-sm"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <AccountMenu />
          <Button href="/login" variant="primary-pill-light">
            {t("nav.getStarted")} →
          </Button>
        </div>
      </div>
    </header>
  );
}
