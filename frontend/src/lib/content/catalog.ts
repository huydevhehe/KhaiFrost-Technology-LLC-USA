import { useMemo } from "react";
import { blogPosts } from "@/content/blogPosts";
import { clientLocations as staticClientLocations } from "@/content/clientLocations";
import { testimonials as staticTestimonials } from "@/content/testimonials";
import { projects as staticProjects } from "@/content/projects";
import { services as staticServices } from "@/content/services";
import type { BlogPost, ClientLocation, Project, ServiceIcon, ServiceItem, Testimonial } from "@/types";
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
      categorySlug: dto.category?.slug || undefined,
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
// Project categories (GET /public/projects/categories), used by the /du-an filter pills
// ---------------------------------------------------------------------------

interface ProjectCategoryDto {
  slug?: string;
  name?: string;
  projectCount?: number;
}

export interface ProjectCategoryFilter {
  slug: string;
  label: { en: string; vi: string };
}

export function useProjectCategories(): ProjectCategoryFilter[] {
  const locale = useContentLocale();
  const dtos = usePublicData<ProjectCategoryDto[]>("/public/projects/categories");
  return useMemo(() => {
    const mapped: ProjectCategoryFilter[] = [];
    for (const dto of asArray<ProjectCategoryDto>(dtos)) {
      if (typeof dto.slug !== "string" || dto.slug === "" || !dto.name || dto.projectCount === 0) continue;
      mapped.push({ slug: dto.slug, label: localized(locale, dto.name, { en: dto.name, vi: dto.name }) });
    }
    if (mapped.length > 0) return mapped;
    return staticServices.map((s) => ({ slug: s.slug, label: s.title }));
  }, [locale, dtos]);
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

// ---------------------------------------------------------------------------
// Client locations (GET /public/client-locations): markers of the "trusted worldwide" map
// ---------------------------------------------------------------------------

interface ClientLocationDto {
  id?: string;
  name?: string;
  role?: string;
  country?: string;
  quote?: string;
  x?: number;
  y?: number;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
}

function mapClientLocations(locale: ContentLocale, dtos: ClientLocationDto[] | undefined): ClientLocation[] {
  const mapped: ClientLocation[] = [];
  for (const dto of asArray<ClientLocationDto>(dtos)) {
    if (typeof dto.id !== "string" || typeof dto.x !== "number" || typeof dto.y !== "number") continue;
    const fallback = staticClientLocations[mapped.length];
    const avatar = text(dto.avatarUrl, fallback?.avatar ?? "");
    const coverImage = text(dto.coverImageUrl, fallback?.coverImage ?? "");
    if (avatar === "" || coverImage === "") continue;
    mapped.push({
      id: dto.id,
      name: text(dto.name, fallback?.name ?? ""),
      role: text(dto.role, fallback?.role ?? ""),
      country: text(dto.country, fallback?.country ?? ""),
      quote: localized(locale, dto.quote, fallback?.quote ?? { en: "", vi: "" }),
      avatar,
      coverImage,
      x: dto.x,
      y: dto.y,
    });
  }
  return mapped.length > 0 ? mapped : staticClientLocations;
}

export function useClientLocations(): ClientLocation[] {
  const locale = useContentLocale();
  const dtos = usePublicData<ClientLocationDto[]>("/public/client-locations", { query: { pageSize: 100 } });
  return useMemo(() => mapClientLocations(locale, dtos), [locale, dtos]);
}

// ---------------------------------------------------------------------------
// Testimonials (GET /public/testimonials)
// ---------------------------------------------------------------------------

interface TestimonialDto {
  id?: string;
  authorName?: string;
  authorRole?: string | null;
  company?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  quote?: string;
}

function mapTestimonials(locale: ContentLocale, dtos: TestimonialDto[] | undefined): Testimonial[] {
  const mapped: Testimonial[] = [];
  for (const dto of asArray<TestimonialDto>(dtos)) {
    if (typeof dto.id !== "string") continue;
    const fallback = staticTestimonials[mapped.length];
    const thumbnail = text(dto.avatarUrl, fallback?.thumbnail ?? "");
    if (thumbnail === "") continue;
    mapped.push({
      id: dto.id,
      quote: localized(locale, dto.quote, fallback?.quote ?? { en: "", vi: "" }),
      name: text(dto.authorName, fallback?.name ?? ""),
      role: text(dto.location ?? dto.authorRole ?? dto.company, fallback?.role ?? ""),
      thumbnail,
    });
  }
  return mapped.length > 0 ? mapped : staticTestimonials;
}

export function useTestimonials(): Testimonial[] {
  const locale = useContentLocale();
  const dtos = usePublicData<TestimonialDto[]>("/public/testimonials");
  return useMemo(() => mapTestimonials(locale, dtos), [locale, dtos]);
}
