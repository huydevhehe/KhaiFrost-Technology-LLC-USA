import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  ProjectDetailResponseDto,
  ProjectListItemResponseDto,
  PublicProjectCardResponseDto,
  PublicProjectDetailResponseDto,
} from '../dto/project-response.dto';
import { ProjectCategoryTranslation } from '../entities/project-category-translation.entity';
import { ProjectImage } from '../entities/project-image.entity';
import { ProjectSectionTranslation } from '../entities/project-section-translation.entity';
import { ProjectSection } from '../entities/project-section.entity';
import { ProjectTranslation } from '../entities/project-translation.entity';
import { Project } from '../entities/project.entity';

export type MediaUrlMap = Map<string, string>;
type Loose = Record<string, unknown>;

export interface ProjectSectionRecord {
  section: ProjectSection;
  translations: ProjectSectionTranslation[];
}

export interface ProjectAggregate {
  project: Project;
  translations: ProjectTranslation[];
  gallery: ProjectImage[];
  sections: ProjectSectionRecord[];
}

const urlOf = (urls: MediaUrlMap, id: string | null | undefined) =>
  id ? (urls.get(id) ?? null) : null;

export function collectProjectMediaIds(aggregate: ProjectAggregate): string[] {
  const ids: string[] = [];
  if (aggregate.project.thumbnailId) ids.push(aggregate.project.thumbnailId);
  for (const image of aggregate.gallery) ids.push(image.mediaAssetId);
  for (const translation of aggregate.translations) {
    if (translation.ogImageId) ids.push(translation.ogImageId);
  }
  return ids;
}

export function toAdminProjectDetail(
  aggregate: ProjectAggregate,
  urls: MediaUrlMap,
): ProjectDetailResponseDto {
  const { project } = aggregate;
  const translations: Loose = {};
  for (const locale of SUPPORTED_LOCALES) {
    const row = aggregate.translations.find((candidate) => candidate.locale === locale);
    if (!row) continue;
    translations[locale] = {
      title: row.title,
      summary: row.summary,
      descriptionHtml: row.descriptionHtml,
      industry: row.industry,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      seoKeywords: row.seoKeywords,
      canonicalUrl: row.canonicalUrl,
      noIndex: row.noIndex,
      ogImageId: row.ogImageId,
      ogImageUrl: urlOf(urls, row.ogImageId),
    };
  }
  return {
    id: project.id,
    slug: project.slug,
    status: project.status,
    featured: project.featured,
    sortOrder: project.sortOrder,
    categoryId: project.categoryId,
    thumbnailId: project.thumbnailId,
    thumbnailUrl: urlOf(urls, project.thumbnailId),
    clientName: project.clientName,
    technologies: project.technologies,
    demoUrl: project.demoUrl,
    videoUrl: project.videoUrl,
    hasVideo: project.hasVideo,
    videoDuration: project.videoDuration,
    completedAt: project.completedAt,
    publishedAt: project.publishedAt,
    gallery: aggregate.gallery.map((image) => ({
      mediaAssetId: image.mediaAssetId,
      url: urlOf(urls, image.mediaAssetId),
      sortOrder: image.sortOrder,
    })),
    sections: aggregate.sections.map(({ section, translations: rows }) => {
      const byLocale: Loose = {};
      for (const row of rows) {
        byLocale[row.locale] = { heading: row.heading, bodyHtml: row.bodyHtml };
      }
      return { id: section.id, sortOrder: section.sortOrder, translations: byLocale };
    }),
    translations,
    version: project.version,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    createdById: project.createdById,
  };
}

export function toAdminProjectListItem(
  project: Project,
  translations: ProjectTranslation[],
  urls: MediaUrlMap,
): ProjectListItemResponseDto {
  const titleOf = (locale: Locale) =>
    translations.find((row) => row.locale === locale)?.title ?? '';
  return {
    id: project.id,
    slug: project.slug,
    status: project.status,
    featured: project.featured,
    sortOrder: project.sortOrder,
    categoryId: project.categoryId,
    thumbnailUrl: urlOf(urls, project.thumbnailId),
    titles: { vi: titleOf(Locale.VI), en: titleOf(Locale.EN) },
    createdById: project.createdById,
    version: project.version,
    updatedAt: project.updatedAt,
  };
}

export interface CategoryLabel {
  slug: string;
  name: string;
}

export function toPublicProjectCard(
  project: Project,
  translation: ProjectTranslation | undefined,
  category: CategoryLabel | null,
  urls: MediaUrlMap,
): PublicProjectCardResponseDto {
  return {
    slug: project.slug,
    title: translation?.title ?? '',
    summary: translation?.summary ?? '',
    thumbnailUrl: urlOf(urls, project.thumbnailId),
    category,
    technologies: project.technologies,
    demoUrl: project.demoUrl,
    hasVideo: project.hasVideo,
    videoDuration: project.videoDuration,
    featured: project.featured,
    clientName: project.clientName,
    industry: translation?.industry ?? null,
    completedAt: project.completedAt,
  };
}

export function toPublicProjectDetail(
  aggregate: ProjectAggregate,
  locale: Locale,
  category: CategoryLabel | null,
  urls: MediaUrlMap,
): PublicProjectDetailResponseDto {
  const translation = aggregate.translations.find((row) => row.locale === locale);
  return {
    ...toPublicProjectCard(aggregate.project, translation, category, urls),
    descriptionHtml: translation?.descriptionHtml ?? '',
    videoUrl: aggregate.project.videoUrl,
    gallery: aggregate.gallery.map((image) => ({ url: urlOf(urls, image.mediaAssetId) })),
    sections: aggregate.sections.map(({ translations }) => {
      const row = translations.find((candidate) => candidate.locale === locale);
      return { heading: row?.heading ?? '', bodyHtml: row?.bodyHtml ?? '' };
    }),
    seo: translation
      ? {
          title: translation.seoTitle,
          description: translation.seoDescription,
          keywords: translation.seoKeywords,
          canonicalUrl: translation.canonicalUrl,
          noIndex: translation.noIndex,
          ogImageUrl: urlOf(urls, translation.ogImageId),
        }
      : null,
  };
}

export function categoryLabel(
  category: { slug: string } | undefined,
  translations: ProjectCategoryTranslation[],
  locale: Locale,
): CategoryLabel | null {
  if (!category) return null;
  const row = translations.find((candidate) => candidate.locale === locale);
  return { slug: category.slug, name: row?.name ?? '' };
}
