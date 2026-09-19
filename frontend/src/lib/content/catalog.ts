import { useMemo } from "react";
import { blogPosts } from "@/content/blogPosts";
import { projects as staticProjects } from "@/content/projects";
import { services as staticServices } from "@/content/services";
import type { BlogPost, Project, ServiceIcon, ServiceItem } from "@/types";
import { asArray, localized, text, useContentLocale, usePublicData, type ContentLocale } from "./store";

const SERVICE_ICONS: readonly ServiceIcon[] = ["ai", "cloud", "security", "code"];

// ---------------------------------------------------------------------------
// Services list (GET /public/services)
// ---------------------------------------------------------------------------

export interface ServiceSummaryDto {
  slug?: string;
  iconKey?: string;
  title?: string;
  summary?: string;
  imageUrl?: string | null;
}

export function mapServiceSummary(locale: ContentLocale, dto: ServiceSummaryDto, index: number): ServiceItem | null {
  if (typeof dto.slug !== "string" || dto.slug === "") return null;
  const fallback = staticServices.find((s) => s.slug === dto.slug);
  const icon = SERVICE_ICONS.find((i) => i === dto.iconKey) ?? fallback?.icon ?? "code";
  return {
    id: fallback?.id ?? `svc-${index}`,
    slug: dto.slug,
    icon,
    title: localized(locale, dto.title, fallback?.title ?? { en: dto.slug, vi: dto.slug }),
    description: localized(locale, dto.summary, fallback?.description ?? { en: "", vi: "" }),
    image: text(dto.imageUrl, fallback?.image ?? ""),
  };
}

export function mapServiceList(locale: ContentLocale, dtos: ServiceSummaryDto[] | undefined): ServiceItem[] {
  const mapped = asArray<ServiceSummaryDto>(dtos)
    .map((dto, i) => mapServiceSummary(locale, dto, i))
    .filter((s): s is ServiceItem => s !== null && s.image !== "");
  return mapped.length > 0 ? mapped : staticServices;
}

export function useServices(): ServiceItem[] {
  const locale = useContentLocale();
  const dtos = usePublicData<ServiceSummaryDto[]>("/public/services");
  return useMemo(() => mapServiceList(locale, dtos), [locale, dtos]);
}

// ---------------------------------------------------------------------------
// Projects (GET /public/projects)
// ---------------------------------------------------------------------------

interface ProjectDto {
  slug?: string;
  title?: string;
  summary?: string;
  thumbnailUrl?: string | null;
  category?: { slug?: string; name?: string } | null;
  technologies?: string[];
  demoUrl?: string | null;
  hasVideo?: boolean;
  videoDuration?: string | null;
}

const PROJECT_QUERY = { pageSize: 50 } as const;

function mapProjects(locale: ContentLocale, dtos: ProjectDto[] | undefined): Project[] {
  const mapped: Project[] = [];
  for (const dto of asArray<ProjectDto>(dtos)) {
    if (typeof dto.slug !== "string" || dto.slug === "") continue;
    const thumbnail = text(dto.thumbnailUrl, "");
    if (thumbnail === "") continue;
    const fallback = staticProjects[mapped.length];
    mapped.push({
      id: dto.slug,
      title: localized(locale, dto.title, fallback?.title ?? { en: dto.slug, vi: dto.slug }),
      description: localized(locale, dto.summary, fallback?.description ?? { en: "", vi: "" }),
      thumbnail,
      techStack: asArray<string>(dto.technologies),
      demoHref: text(dto.demoUrl, "#"),
      categoryLabel: dto.category?.name ? localized(locale, dto.category.name, { en: "", vi: "" }) : undefined,
      hasVideo: !!dto.hasVideo,
      videoDuration: text(dto.videoDuration, "") || undefined,
    });
  }
  return mapped.length > 0 ? mapped : staticProjects;
}

/** All published projects, in the admin-defined order (falls back to the static list). */
export function useProjects(): Project[] {
  const locale = useContentLocale();
  const dtos = usePublicData<ProjectDto[]>("/public/projects", { query: PROJECT_QUERY });
  return useMemo(() => mapProjects(locale, dtos), [locale, dtos]);
}

// ---------------------------------------------------------------------------
// Blog posts list (GET /public/posts), used by the home page preview only
// ---------------------------------------------------------------------------

interface PostDto {
  id?: string;
  title?: string;
  excerpt?: string;
  coverImage?: { url?: string | null; thumbnailUrl?: string | null } | null;
  publishedAt?: string | null;
}

function formatPostDate(iso: string | null | undefined, fallback: string): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function mapPosts(locale: ContentLocale, dtos: PostDto[] | undefined): BlogPost[] {
  const mapped: BlogPost[] = [];
  for (const dto of asArray<PostDto>(dtos)) {
    const thumbnail = text(dto.coverImage?.url, "");
    if (typeof dto.id !== "string" || thumbnail === "") continue;
    const fallback = blogPosts[mapped.length];
    mapped.push({
      id: dto.id,
      title: localized(locale, dto.title, fallback?.title ?? { en: "", vi: "" }),
      excerpt: localized(locale, dto.excerpt, fallback?.excerpt ?? { en: "", vi: "" }),
      date: formatPostDate(dto.publishedAt, fallback?.date ?? ""),
      thumbnail,
      hasVideo: false,
      // Article detail pages are built separately; the card stays a placeholder link for now.
      href: "#",
    });
  }
  return mapped.length > 0 ? mapped : blogPosts;
}

export function useBlogPosts(count = 4): BlogPost[] {
  const locale = useContentLocale();
  const dtos = usePublicData<PostDto[]>("/public/posts", { query: { pageSize: count } });
  return useMemo(() => mapPosts(locale, dtos).slice(0, count), [locale, dtos, count]);
}
