import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { RequestContextService } from '../../../common/context/request-context.service';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { paginate } from '../../../common/dto/paginate';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  notFound,
  translationMissing,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { assertAllLocalesPresent } from '../../../common/utils/assert-all-locales-present';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import { PageStatus } from '../constants/page-status';
import { PublishPageDto, RevertRevisionDto } from '../dto/page-requests.dto';
import {
  PageDetailDto,
  PageRevisionDetailDto,
  PageRevisionSummaryDto,
} from '../dto/page-responses.dto';
import { PageRevision, PageRevisionSnapshot } from '../entities/page-revision.entity';
import { emptySectionContent, PageSection, SectionContent } from '../entities/page-section.entity';
import { PageTranslation } from '../entities/page-translation.entity';
import { Page } from '../entities/page.entity';
import { toRevisionDetail, toRevisionSummary } from '../mappers/page.mapper';
import { extractMediaReferences, findPublishGaps } from '../utils/section-content.validator';
import { PagesService } from './pages.service';
import { SectionContentService } from './section-content.service';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

@Injectable()
export class PagePublishingService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(PageRevision) private readonly revisions: Repository<PageRevision>,
    private readonly pagesService: PagesService,
    private readonly contentService: SectionContentService,
    private readonly mediaReferences: MediaReferenceService,
    private readonly requestContext: RequestContextService,
  ) {}

  async publish(pageId: string, dto: PublishPageDto): Promise<PageDetailDto> {
    await this.dataSource.transaction(async (manager) => {
      const page = await this.lockPage(manager, pageId);
      const translations = await manager.find(PageTranslation, { where: { pageId } });
      const sections = await this.loadSections(manager, pageId);

      assertAllLocalesPresent(
        translations.map((row) => ({ locale: row.locale, title: row.title })),
        ['title'],
      );

      const missingRequired: { field: string; messages: string[] }[] = [];
      const missingTranslations: { locale: string; field: string }[] = [];
      for (const section of sections.filter((item) => item.isVisible)) {
        const gaps = findPublishGaps(
          this.contentService.requireDefinition(section.type),
          section.draftContent,
          section.sectionKey,
        );
        for (const gap of gaps.missingRequired) {
          missingRequired.push({ field: gap.field, messages: ['is required'] });
        }
        missingTranslations.push(...gaps.missingTranslations);
      }
      if (missingRequired.length > 0) throw validationFailed(missingRequired);
      if (missingTranslations.length > 0) throw translationMissing(missingTranslations);

      for (const section of sections.filter((item) => item.isVisible)) {
        section.publishedContent = clone(section.draftContent);
        await manager.save(section);
        await this.contentService.syncMedia(manager, section);
      }

      const revisionNumber = page.currentRevisionNumber + 1;
      await manager.save(
        manager.create(PageRevision, {
          pageId,
          revisionNumber,
          snapshot: this.buildSnapshot(page, translations, sections),
          createdById: this.requestContext.userId ?? null,
          note: dto.note ?? null,
        }),
      );
      page.status = PageStatus.PUBLISHED;
      page.publishedAt = new Date();
      page.currentRevisionNumber = revisionNumber;
      await manager.save(page);
    });
    return this.pagesService.getDetail(pageId);
  }

  // Throws the draft away: every section returns to its last published content
  async discardDraft(pageId: string): Promise<PageDetailDto> {
    await this.dataSource.transaction(async (manager) => {
      await this.lockPage(manager, pageId);
      const sections = await this.loadSections(manager, pageId);
      for (const section of sections) {
        if (section.publishedContent) {
          section.draftContent = clone(section.publishedContent);
          await manager.save(section);
          await this.contentService.syncMedia(manager, section);
        } else if (section.isSystem) {
          section.draftContent = emptySectionContent();
          await manager.save(section);
          await this.contentService.syncMedia(manager, section);
        } else {
          await this.contentService.releaseMedia(manager, [section.id]);
          await manager.softDelete(PageSection, { id: section.id });
        }
      }
    });
    return this.pagesService.getDetail(pageId);
  }

  async listRevisions(
    pageId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PageRevisionSummaryDto>> {
    await this.pagesService.getOrFail(pageId);
    const builder = this.revisions
      .createQueryBuilder('r')
      .where('r.pageId = :pageId', { pageId })
      .orderBy('r.revisionNumber', 'DESC');
    return paginate(builder, query, toRevisionSummary);
  }

  async getRevision(pageId: string, revisionNumber: number): Promise<PageRevisionDetailDto> {
    return toRevisionDetail(await this.findRevision(pageId, revisionNumber));
  }

  // Restores the content of a revision into the drafts; nothing goes live until the page is published again
  async revert(
    pageId: string,
    revisionNumber: number,
    _dto: RevertRevisionDto,
  ): Promise<PageDetailDto> {
    const revision = await this.findRevision(pageId, revisionNumber);
    const snapshotSections = revision.snapshot.sections;

    const mediaIds: string[] = [];
    for (const item of snapshotSections) {
      const definition = this.contentService.requireDefinition(item.type);
      mediaIds.push(
        ...extractMediaReferences(definition, item.content as unknown as SectionContent).map(
          (reference) => reference.mediaAssetId,
        ),
      );
    }
    await this.mediaReferences.assertAllExist(mediaIds);

    await this.dataSource.transaction(async (manager) => {
      await this.lockPage(manager, pageId);
      const existing = await this.loadSections(manager, pageId);
      const byKey = new Map(existing.map((section) => [section.sectionKey, section]));
      let nextOrder = existing.length;
      for (const item of snapshotSections) {
        const content = clone(item.content) as unknown as SectionContent;
        const section = byKey.get(item.sectionKey);
        if (section && section.type === item.type) {
          section.draftContent = content;
          await manager.save(section);
          await this.contentService.syncMedia(manager, section);
        } else if (!section) {
          // A section deleted since then comes back unpublished, so the live page is untouched
          const created = await manager.save(
            manager.create(PageSection, {
              pageId,
              sectionKey: item.sectionKey,
              type: item.type,
              sortOrder: nextOrder,
              isVisible: item.isVisible,
              isSystem: item.isSystem,
              draftContent: content,
              publishedContent: null,
            }),
          );
          nextOrder += 1;
          await this.contentService.syncMedia(manager, created);
        }
      }
    });
    return this.pagesService.getDetail(pageId);
  }

  private buildSnapshot(
    page: Page,
    translations: PageTranslation[],
    sections: PageSection[],
  ): PageRevisionSnapshot {
    const translationSnapshot: PageRevisionSnapshot['translations'] = {};
    for (const locale of SUPPORTED_LOCALES) {
      const row = translations.find((item) => item.locale === locale);
      if (!row) continue;
      translationSnapshot[locale] = {
        title: row.title,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        seoKeywords: row.seoKeywords,
        canonicalUrl: row.canonicalUrl,
        noIndex: row.noIndex,
        ogImageId: row.ogImageId,
      };
    }
    return {
      page: { path: page.path, templateKey: page.templateKey },
      translations: translationSnapshot,
      sections: sections.map((section) => ({
        sectionKey: section.sectionKey,
        type: section.type,
        sortOrder: section.sortOrder,
        isVisible: section.isVisible,
        isSystem: section.isSystem,
        content: clone(
          section.draftContent,
        ) as unknown as PageRevisionSnapshot['sections'][number]['content'],
      })),
    };
  }

  private async findRevision(pageId: string, revisionNumber: number): Promise<PageRevision> {
    const revision = await this.revisions.findOne({ where: { pageId, revisionNumber } });
    if (!revision) throw notFound('Revision');
    return revision;
  }

  private async lockPage(manager: EntityManager, pageId: string): Promise<Page> {
    const page = await manager.findOne(Page, {
      where: { id: pageId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!page) throw notFound('Page');
    return page;
  }

  private loadSections(manager: EntityManager, pageId: string): Promise<PageSection[]> {
    return manager.find(PageSection, {
      where: { pageId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }
}
