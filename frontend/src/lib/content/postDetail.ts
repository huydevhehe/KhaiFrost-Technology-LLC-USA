import { usePublicDataState, type ContentLocale } from "./store";

export interface PublicCoverImage {
  url: string;
  thumbnailUrl: string;
}

export interface PublicPostCategoryRef {
  slug: string;
  name: string;
}

export interface PublicPostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: PublicCoverImage | null;
  category: PublicPostCategoryRef | null;
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  tags: string[];
  isFeatured: boolean;
}

export interface PublicPostSeo {
  title: string;
  description: string;
  keywords: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  ogImageUrl: string | null;
}

export interface PublicPostNeighbor {
  slug: string;
  title: string;
  publishedAt: string;
}

export interface PublicPostDetail extends PublicPostListItem {
  locale: string;
  contentHtml: string;
  seo: PublicPostSeo;
  related: PublicPostListItem[];
  previous: PublicPostNeighbor | null;
  next: PublicPostNeighbor | null;
}

export type PostDetail = PublicPostDetail;

/** Reads a single post by slug for the current UI locale; `notFound` is true once the request has settled with no data. */
export function usePostDetail(slug: string): { post: PostDetail | undefined; notFound: boolean } {
  const { data, failed } = usePublicDataState<PublicPostDetail>(`/public/posts/${encodeURIComponent(slug)}`);
  return { post: data, notFound: failed };
}

/** "12 Tháng 9, 2025" in vi, "September 12, 2025" in en. */
export function formatPostDetailDate(iso: string | null | undefined, locale: ContentLocale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (locale === "vi") {
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear();
    return `${day} Tháng ${month}, ${year}`;
  }
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
