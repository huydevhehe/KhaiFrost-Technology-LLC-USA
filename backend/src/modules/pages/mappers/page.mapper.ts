import { Locale } from '../../../common/enums/locale.enum';
import { listSectionTypeDefinitions } from '../constants/section-types.registry';
import {
  PageDetailDto,
  PageRevisionDetailDto,
  PageRevisionSummaryDto,
  PageSectionDto,
  PageSummaryDto,
} from '../dto/page-responses.dto';
import { PageRevision } from '../entities/page-revision.entity';
import { PageSection } from '../entities/page-section.entity';
import { PageTranslation } from '../entities/page-translation.entity';
import { Page } from '../entities/page.entity';

export function sectionHasUnpublishedChanges(section: PageSection): boolean {
  if (section.publishedContent === null) return true;
  return JSON.stringify(section.publishedContent) !== JSON.stringify(section.draftContent);
}

export function titlesOf(translations: PageTranslation[]): {
  vi: string | null;
  en: string | null;
} {
  const byLocale = new Map(translations.map((row) => [row.locale, row.title]));
  return { vi: byLocale.get(Locale.VI) ?? null, en: byLocale.get(Locale.EN) ?? null };
}

export function toSectionDto(section: PageSection): PageSectionDto {
  return {
    id: section.id,
    sectionKey: section.sectionKey,
    type: section.type,
    sortOrder: section.sortOrder,
    isVisible: section.isVisible,
    isSystem: section.isSystem,
    version: section.version,
    draftContent: section.draftContent as unknown as Record<string, unknown>,
    publishedContent: section.publishedContent as unknown as Record<string, unknown> | null,
    hasUnpublishedChanges: sectionHasUnpublishedChanges(section),
    updatedAt: section.updatedAt,
  };
}

export function toSummaryDto(
  page: Page,
  translations: PageTranslation[],
  sectionCount: number,
  hasUnpublishedChanges: boolean,
): PageSummaryDto {
  return {
    id: page.id,
    path: page.path,
    templateKey: page.templateKey,
    status: page.status,
    isSystem: page.isSystem,
    title: titlesOf(translations),
    publishedAt: page.publishedAt,
    currentRevisionNumber: page.currentRevisionNumber,
    sectionCount,
    hasUnpublishedChanges,
    version: page.version,
    updatedAt: page.updatedAt,
  };
}

export function toDetailDto(
  page: Page,
  translations: PageTranslation[],
  sections: PageSection[],
): PageDetailDto {
  const usedTypes = new Set(sections.map((section) => section.type));
  const sectionTypes = Object.fromEntries(
    listSectionTypeDefinitions()
      .filter((definition) => usedTypes.has(definition.type))
      .map((definition) => [definition.type, definition]),
  );
  const sectionDtos = sections.map(toSectionDto);
  return {
    ...toSummaryDto(
      page,
      translations,
      sections.length,
      sections.some((section) => section.isVisible && sectionHasUnpublishedChanges(section)),
    ),
    translations: Object.fromEntries(
      translations.map((row) => [
        row.locale,
        {
          title: row.title,
          seoTitle: row.seoTitle,
          seoDescription: row.seoDescription,
          seoKeywords: row.seoKeywords,
          canonicalUrl: row.canonicalUrl,
          noIndex: row.noIndex,
          ogImageId: row.ogImageId,
        },
      ]),
    ),
    sections: sectionDtos,
    sectionTypes,
  };
}

export function toRevisionSummary(revision: PageRevision): PageRevisionSummaryDto {
  return {
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    note: revision.note,
    createdById: revision.createdById,
    createdAt: revision.createdAt,
    sectionCount: revision.snapshot.sections.length,
  };
}

export function toRevisionDetail(revision: PageRevision): PageRevisionDetailDto {
  return {
    ...toRevisionSummary(revision),
    snapshot: revision.snapshot as unknown as Record<string, unknown>,
  };
}
