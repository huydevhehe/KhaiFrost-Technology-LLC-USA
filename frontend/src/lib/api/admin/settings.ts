// Site settings (/admin/settings/:group).
// Mirrors backend/src/modules/settings/dto/groups/*.
//
// A PUT replaces the WHOLE value of a group and is validated against the group
// schema with `forbidNonWhitelisted`, so only the documented keys may be sent.

import { api } from "../client";
import type { Locale } from "../types";

export const SETTING_GROUPS = [
  "company",
  "branding",
  "social",
  "contact",
  "localization",
  "seo-defaults",
] as const;
export type SettingGroup = (typeof SETTING_GROUPS)[number];

export const SETTING_GROUP_LABELS: Record<SettingGroup, string> = {
  company: "Công ty",
  branding: "Thương hiệu",
  social: "Mạng xã hội",
  contact: "Liên hệ",
  localization: "Ngôn ngữ",
  "seo-defaults": "SEO mặc định",
};

export interface LocalizedText {
  vi: string;
  en: string;
}

export interface SettingResponse<T = Record<string, unknown>> {
  group: string;
  value: T;
  isPublic: boolean;
  /** True while the group still has its built-in default (version is then 0). */
  isDefault: boolean;
  version: number;
  updatedAt: string | null;
  /** MediaAsset id -> public url, for previews. */
  mediaUrls: Record<string, string>;
}

export interface UpdateSettingInput<T = Record<string, unknown>> {
  /** Version last read; 0 when the group was never saved. */
  version: number;
  value: T;
  isPublic?: boolean;
}

// ---- Group value shapes ------------------------------------------------

export interface CompanySettings {
  companyName: string;
  email: string;
  phone: string;
  address: LocalizedText;
  website: string;
}

export interface BrandingSettings {
  logoId?: string | null;
  logoDarkId?: string | null;
  faviconId?: string | null;
  brandColor?: string | null;
}

export interface SocialLink {
  network: string;
  url: string;
}

export interface SocialSettings {
  links: SocialLink[];
}

export const CONTACT_CHANNEL_TYPES = [
  "email",
  "phone",
  "zalo",
  "whatsapp",
  "telegram",
  "messenger",
  "other",
] as const;
export type ContactChannelType = (typeof CONTACT_CHANNEL_TYPES)[number];

export const CONTACT_CHANNEL_LABELS: Record<ContactChannelType, string> = {
  email: "Email",
  phone: "Điện thoại",
  zalo: "Zalo",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  messenger: "Messenger",
  other: "Khác",
};

export interface ContactChannel {
  type: ContactChannelType;
  value: string;
  label?: LocalizedText;
}

export interface OfficeLocation {
  id: string;
  label: LocalizedText;
  street: string;
  city: string;
  state?: string | null;
  zip?: string | null;
  country: string;
  countryCode: string;
  mapX?: number | null;
  mapY?: number | null;
  imageId?: string | null;
}

export interface ContactSettings {
  channels: ContactChannel[];
  businessHours?: LocalizedText;
  offices: OfficeLocation[];
}

export interface LocalizationSettings {
  defaultLocale: Locale;
  enabledLocales: Locale[];
}

export interface SeoDefaultsSettings {
  siteName: string;
  titleTemplate: string;
  defaultDescription?: LocalizedText;
  defaultOgImageId?: string | null;
  twitterHandle?: string | null;
}

/** Field limits taken from the DTO decorators. */
export const SETTING_LIMITS = {
  companyNameMax: 200,
  emailMax: 254,
  phoneMax: 30,
  websiteMax: 300,
  localizedTextMax: 500,
  networkMax: 30,
  urlMax: 500,
  channelValueMax: 200,
  officeIdMax: 60,
  streetMax: 200,
  cityMax: 100,
  stateMax: 60,
  zipMax: 20,
  countryMax: 100,
  siteNameMax: 120,
  titleTemplateMax: 120,
  maxListSize: 20,
} as const;

export const settingsApi = {
  get: <T = Record<string, unknown>>(group: SettingGroup, signal?: AbortSignal): Promise<SettingResponse<T>> =>
    api.get<SettingResponse<T>>(`/admin/settings/${group}`, undefined, { signal }),

  /** Rejected with 409 VERSION_CONFLICT when the group changed in the meantime. */
  update: <T = Record<string, unknown>>(
    group: SettingGroup,
    input: UpdateSettingInput<T>,
  ): Promise<SettingResponse<T>> => api.put<SettingResponse<T>>(`/admin/settings/${group}`, input),
};
