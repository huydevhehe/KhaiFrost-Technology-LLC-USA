"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SocialIcons } from "@/components/ui/SocialIcons";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { navLinks } from "@/content/navLinks";
import { services } from "@/content/services";
import { siteConfig } from "@/content/siteConfig";

function OfficeMap() {
  const { t } = useTranslation();

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
        {t("footer.ourOffices")}
      </p>
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-lg bg-navy">
        <Image
          src="/images/map/global-reach.png"
          alt="Global map showing KhaiFrost offices in Houston and Ho Chi Minh City"
          fill
          sizes="320px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-white/10 bg-navy py-14 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900">
                K
              </span>
              <span className="text-sm font-semibold">KHAIFROST</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/60">
              {t("footer.description")}
            </p>
            <div className="mt-5">
              <SocialIcons />
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-white/50">
              {t("footer.quickLinks")}
            </p>
            <ul className="space-y-3 text-sm text-white/70">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white">
                    {t(`nav.${link.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-white/50">
              {t("footer.ourServices")}
            </p>
            <ul className="space-y-3 text-sm text-white/70">
              {services.map((service) => (
                <ServiceLink key={service.id} service={service} />
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-white/50">
              {t("footer.contactUs")}
            </p>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-white/40" />
                <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
                  {siteConfig.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-white/40" />
                <a href={`tel:${siteConfig.phone}`} className="hover:text-white">
                  {siteConfig.phone}
                </a>
              </li>
            </ul>
            <div className="mt-5">
              <OfficeMap />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <p>{t("footer.copyright")}</p>
          <div className="flex items-center gap-4">
            <Link href="#">{t("footer.privacy")}</Link>
            <Link href="#">{t("footer.terms")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function ServiceLink({
  service,
}: {
  service: (typeof services)[number];
}) {
  const title = useLocalizedField(service.title);
  return <li className="hover:text-white">{title}</li>;
}
