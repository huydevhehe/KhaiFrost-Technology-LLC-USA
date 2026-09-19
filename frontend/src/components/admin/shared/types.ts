import type { Locale } from "@/lib/api/types";

export type { Locale };

/** Locales the admin edits, in tab order. */
export const LOCALES: readonly Locale[] = ["vi", "en"] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  vi: "VI",
  en: "EN",
};

/** The minimal shape a form keeps for a picked media asset. */
export interface MediaSelection {
  id: string;
  url: string;
  thumbnailUrl: string;
  name: string;
}

/** Which kind of asset a picker accepts. */
export type MediaAccept = "image" | "pdf" | "any";

/** Publication workflow state shared by posts, products, projects, services, pages. */
export type PublicationStatus = "draft" | "in_review" | "published" | "archived";
