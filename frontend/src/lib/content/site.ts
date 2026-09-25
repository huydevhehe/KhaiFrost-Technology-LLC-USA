import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { navLinks } from "@/content/navLinks";
import { services } from "@/content/services";
import { siteConfig } from "@/content/siteConfig";
import type { OfficeLocation, SiteConfig, SocialLink } from "@/types";
import { asArray, text, useContentLocale, usePublicData, type ContentLocale } from "./store";

// ---------------------------------------------------------------------------
// Site settings (GET /public/settings)
// ---------------------------------------------------------------------------

interface MediaLike {
  url?: string | null;
}

interface SettingsDto {
  company?: { companyName?: string };
  branding?: { logo?: string | MediaLike | null; logoDark?: string | MediaLike | null };
  social?: { links?: { network?: string; url?: string }[] };
  contact?: {
    offices?: {
      id?: string;
      label?: string;
      street?: string;
      city?: string;
      state?: string | null;
      zip?: string | null;
      country?: string;
      countryCode?: string;
      mapX?: number | null;
      mapY?: number | null;
      image?: string | MediaLike | null;
    }[];
    channels?: { type?: string; value?: string }[];
  };
}

export function mediaUrl(value: string | MediaLike | null | undefined): string | undefined {
  if (typeof value === "string") return value.trim() !== "" ? value : undefined;
  if (value && typeof value.url === "string" && value.url.trim() !== "") return value.url;
  return undefined;
}

const SOCIAL_LABEL_BY_NETWORK: Record<string, SocialLink["label"]> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X",
  twitter: "X",
};

export interface ResolvedOffice extends OfficeLocation {
  imageUrl?: string;
}

export interface ResolvedSiteConfig extends Omit<SiteConfig, "offices"> {
  offices: ResolvedOffice[];
  logoUrl?: string;
  logoDarkUrl?: string;
}

function mapOffices(locale: ContentLocale, dto: SettingsDto): ResolvedOffice[] {
  const offices: ResolvedOffice[] = [];
  for (const raw of asArray<NonNullable<NonNullable<SettingsDto["contact"]>["offices"]>[number]>(dto.contact?.offices)) {
    const staticMatch = siteConfig.offices.find((o) => o.id === raw.id);
    const label = text(raw.label, staticMatch?.label[locale] ?? "");
    offices.push({
      id: text(raw.id, staticMatch?.id ?? `office-${offices.length + 1}`),
      label: { en: label, vi: label },
      street: text(raw.street, staticMatch?.street ?? ""),
      city: text(raw.city, staticMatch?.city ?? ""),
      state: text(raw.state, staticMatch?.state ?? "") || undefined,
      zip: text(raw.zip, ""),
      country: text(raw.country, staticMatch?.country ?? ""),
      countryCode: text(raw.countryCode, staticMatch?.countryCode ?? ""),
      x: typeof raw.mapX === "number" ? raw.mapX : (staticMatch?.x ?? 50),
      y: typeof raw.mapY === "number" ? raw.mapY : (staticMatch?.y ?? 50),
      imageUrl: mediaUrl(raw.image),
    });
  }
  return offices;
}

function mapSettings(locale: ContentLocale, dto: SettingsDto | undefined): ResolvedSiteConfig {
  if (!dto) return { ...siteConfig, offices: siteConfig.offices };
  const channels = asArray<{ type?: string; value?: string }>(dto.contact?.channels);
  const email = channels.find((c) => c.type === "email")?.value;
  const phone = channels.find((c) => c.type === "phone")?.value;

  const socialLinks: SocialLink[] = [];
  for (const link of asArray<{ network?: string; url?: string }>(dto.social?.links)) {
    const label = SOCIAL_LABEL_BY_NETWORK[(link.network ?? "").toLowerCase()];
    if (label && typeof link.url === "string" && link.url.trim() !== "") {
      socialLinks.push({ label, href: link.url });
    }
  }

  const offices = mapOffices(locale, dto);
  return {
    companyName: text(dto.company?.companyName, siteConfig.companyName),
    email: text(email, siteConfig.email),
    phone: text(phone, siteConfig.phone),
    // No API equivalent (company.address is the registered address, a different value).
    address: siteConfig.address,
    offices: offices.length > 0 ? offices : siteConfig.offices,
    socialLinks: socialLinks.length > 0 ? socialLinks : siteConfig.socialLinks,
    logoUrl: mediaUrl(dto.branding?.logo),
    logoDarkUrl: mediaUrl(dto.branding?.logoDark),
  };
}

/** Company contact info, offices, social links and logos. Static siteConfig is the initial value and fallback. */
export function useSiteConfig(): ResolvedSiteConfig {
  const locale = useContentLocale();
  const dto = usePublicData<SettingsDto>("/public/settings");
  return useMemo(() => mapSettings(locale, dto), [locale, dto]);
}

// ---------------------------------------------------------------------------
// Navigation (GET /public/navigation/header|footer)
// ---------------------------------------------------------------------------

interface NavItemDto {
  id?: string;
  label?: string;
  href?: string | null;
  openInNewTab?: boolean;
  isFeatured?: boolean;
  children?: NavItemDto[];
}

interface NavigationDto {
  items?: NavItemDto[];
}

export interface ResolvedNavLink {
  href: string;
  label: string;
  newTab: boolean;
  featured: boolean;
}

/** Header links in menu order (items without a link are skipped). */
export function useHeaderLinks(): ResolvedNavLink[] {
  const { t } = useTranslation();
  const dto = usePublicData<NavigationDto>("/public/navigation/header");
  return useMemo(() => {
    const items = asArray<NavItemDto>(dto?.items).filter((i) => typeof i.href === "string" && i.href !== "");
    if (items.length === 0) {
      return navLinks.map((l) => ({ href: l.href, label: t(`nav.${l.key}`), newTab: false, featured: false }));
    }
    return items.map((i) => ({
      href: i.href as string,
      label: text(i.label, i.href as string),
      newTab: !!i.openInNewTab,
      featured: !!i.isFeatured,
    }));
  }, [dto, t]);
}

export interface ResolvedFooterLink {
  /** Missing when the entry is plain text (no destination configured). */
  href?: string;
  label: string;
  newTab: boolean;
}

export interface ResolvedFooterColumn {
  key: string;
  title: string;
  links: ResolvedFooterLink[];
}

/**
 * Footer columns: every top-level group in the "footer" menu becomes its own column,
 * in menu order. A group with no linkable children is skipped (it renders no column).
 * With no menu configured at all, falls back to the default quick-links + services columns.
 */
export function useFooterNav(): ResolvedFooterColumn[] {
  const { t, i18n } = useTranslation();
  const dto = usePublicData<NavigationDto>("/public/navigation/footer");
  return useMemo(() => {
    const lang = i18n.language?.startsWith("vi") ? "vi" : "en";
    const groups = asArray<NavItemDto>(dto?.items);
    const toLinks = (group?: NavItemDto): ResolvedFooterLink[] =>
      asArray<NavItemDto>(group?.children)
        .filter((c) => typeof c.href === "string" && c.href !== "")
        .map((c) => ({ href: c.href as string, label: text(c.label, c.href as string), newTab: !!c.openInNewTab }));

    if (groups.length === 0) {
      return [
        {
          key: "quick",
          title: t("footer.quickLinks"),
          links: navLinks.map((l) => ({ href: l.href, label: t(`nav.${l.key}`), newTab: false })),
        },
        {
          key: "services",
          title: t("footer.ourServices"),
          links: services.map((s) => ({ label: s.title[lang], newTab: false })),
        },
      ];
    }

    return groups
      .map((group, index) => ({
        key: group.id ?? String(index),
        title: text(group.label, `Cột ${index + 1}`),
        links: toLinks(group),
      }))
      .filter((column) => column.links.length > 0);
  }, [dto, t, i18n.language]);
}
