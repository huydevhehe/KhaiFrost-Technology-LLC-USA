import { useMemo } from "react";
import type { ServiceCategoryStat, ServiceCategoryWhyUsItem } from "@/types";
import { categoryIcon } from "./serviceDetail";
import { asArray, localized, text, useContentLocale, usePublicData } from "./store";

// GET /public/pages/by-path?path=/... : page composition (sections with free-form content per section key).

interface PageSectionDto {
  key?: string;
  content?: Record<string, unknown> | null;
}

interface PageDto {
  sections?: PageSectionDto[];
}

export type SectionContent = Record<string, unknown>;

const EMPTY: SectionContent = {};

/** Content of one page section, or an empty object while loading / when the page or section is missing. */
export function useSection(path: string, sectionKey: string): SectionContent {
  const page = usePublicData<PageDto>("/public/pages/by-path", { query: { path } });
  return useMemo(() => {
    const section = asArray<PageSectionDto>(page?.sections).find((s) => s.key === sectionKey);
    return section?.content && typeof section.content === "object" ? section.content : EMPTY;
  }, [page, sectionKey]);
}

/** Returns a reader `(field, fallback) => string`: the section field when it is a non-empty string, else the fallback. */
export function useSectionText(path: string, sectionKey: string): (field: string, fallback: string) => string {
  const content = useSection(path, sectionKey);
  return useMemo(() => (field: string, fallback: string) => text(content[field], fallback), [content]);
}

/** Url of a media field (`{ url }` object or plain string) in section content. */
export function sectionImageUrl(content: SectionContent, field: string): string | undefined {
  const value = content[field];
  if (typeof value === "string" && value.trim() !== "") return value;
  if (value && typeof value === "object") {
    const url = (value as { url?: unknown }).url;
    if (typeof url === "string" && url.trim() !== "") return url;
  }
  return undefined;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Hero headlines are stored as one string in the page composition, while some static heroes break the line by
 * hand. When the API text equals the static two-line text the static line break is kept; otherwise the API text
 * is shown as a single flowing headline (`line2` is null).
 */
export function headlineLines(apiHeadline: string, line1: string, line2: string): { line1: string; line2: string | null } {
  const same = normalizeSpace(apiHeadline) === normalizeSpace(`${line1} ${line2}`);
  return same ? { line1, line2 } : { line1: apiHeadline, line2: null };
}

interface PageStatDto {
  icon?: string;
  value?: string;
  label?: string;
  description?: string;
}

/** Stats strip stored as `{ items: [{ icon, value, label, description }] }` in a page section. */
export function usePageStats(path: string, sectionKey: string, fallback: ServiceCategoryStat[]): ServiceCategoryStat[] {
  const locale = useContentLocale();
  const content = useSection(path, sectionKey);
  return useMemo(() => {
    const items = asArray<PageStatDto>(content.items);
    if (items.length === 0) return fallback;
    return items.map((item, i) => ({
      icon: categoryIcon(item.icon, fallback[i]?.icon ?? "rocket"),
      value: text(item.value, fallback[i]?.value ?? ""),
      label: localized(locale, item.label, fallback[i]?.label ?? { en: "", vi: "" }),
      description: localized(locale, item.description, fallback[i]?.description ?? { en: "", vi: "" }),
    }));
  }, [content, fallback, locale]);
}

const HTML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

/** Plain text of every <p> (or of the whole value when it has none) in an HTML rich-text field; tags are dropped. */
export function htmlParagraphs(html: unknown): string[] {
  if (typeof html !== "string" || html.trim() === "") return [];
  const chunks = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [html];
  return chunks
    .map((chunk) =>
      chunk
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/&(#?\w+);/g, (m, name: string) => HTML_ENTITIES[name] ?? m)
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((p) => p !== "");
}

interface PageCardDto {
  icon?: string;
  title?: string;
  description?: string;
}

/** Card grid section (`{ items: [{ icon, title, description }] }`) shown as icon + title + description cards. */
export function usePageCards(path: string, sectionKey: string, fallback: ServiceCategoryWhyUsItem[]): ServiceCategoryWhyUsItem[] {
  const locale = useContentLocale();
  const content = useSection(path, sectionKey);
  return useMemo(() => {
    const items = asArray<PageCardDto>(content.items);
    if (items.length === 0) return fallback;
    return items.map((item, i) => ({
      icon: categoryIcon(item.icon, fallback[i]?.icon ?? "briefcase"),
      title: localized(locale, item.title, fallback[i]?.title ?? { en: "", vi: "" }),
      description: localized(locale, item.description, fallback[i]?.description ?? { en: "", vi: "" }),
    }));
  }, [content, fallback, locale]);
}
