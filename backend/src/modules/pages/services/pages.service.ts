import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { RequestContextService } from '../../../common/context/request-context.service';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  conflict,
  notFound,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import { PageStatus } from '../constants/page-status';
import {
  CreatePageDto,
  ListPagesQueryDto,
  PageTranslationsInputDto,
  UpdatePageDto,
} from '../dto/page-requests.dto';
import { PageDetailDto, PageSummaryDto } from '../dto/page-responses.dto';
import { PageSectionMedia } from '../entities/page-section-media.entity';
import { PageSection } from '../entities/page-section.entity';
import { PageTranslation } from '../entities/page-translation.entity';
import { Page } from '../entities/page.entity';
import { toDetailDto, toSummaryDto } from '../mappers/page.mapper';
import { assertValidPagePath } from '../utils/page-path';

const SORTABLE_FIELDS = ['path', 'status', 'createdAt', 'updatedAt', 'publishedAt'] as const;
const PATH_CONSTRAINT = 'uq_pages_path';

export const PROTECTED_CODE = 'SYSTEM_RESOURCE_PROTECTED';

export interface CreatePageOptions {
  isSystem?: boolean;
}

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    @InjectRepository(PageTranslation) private readonly translations: Repository<PageTranslation>,
    @InjectRepository(PageSection) private readonly sections: Repository<PageSection>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mediaReferences: MediaReferenceService,
    private readonly requestContext: RequestContextService,
  ) {}

  async list(query: ListPagesQueryDto): Promise<PaginatedResponseDto<PageSummaryDto>> {
    const builder = this.pages.createQueryBuilder('p');
    if (query.status) builder.andWhere('p.status = :status', { status: query.status });
    if (query.search) {
      builder.andWhere(
        `(p.path ILIKE :search OR EXISTS (SELECT 1 FROM page_translations t WHERE t.page_id = p.id AND t.title ILIKE :search))`,
        { search: containsPattern(query.search) },
      );
    }
    if (query.sortBy) {
      const sort = resolveSort(query, SORTABLE_FIELDS, 'path');
      builder.orderBy(`p.${sort.field}`, sort.order).addOrderBy('p.path', 'ASC');
    } else {
      builder.orderBy('p.path', 'ASC');
    }
    const result = await paginate(builder, query);
    const pages = result.items;
    const ids = pages.map((page) => page.id);
    const translations = ids.length
      ? await this.translations.find({ where: { pageId: In(ids) } })
      : [];
    const stats = await this.loadSectionStats(ids);
    const items = pages.map((page) =>
      toSummaryDto(
        page,
        translations.filter((row) => row.pageId === page.id),
        stats.get(page.id)?.count ?? 0,
        stats.get(page.id)?.dirty ?? false,
      ),
    );
    return new PaginatedResponseDto(items, result.meta);
  }

  async getDetail(id: string): Promise<PageDetailDto> {
    const page = await this.getOrFail(id);
    const [translations, sections] = await Promise.all([
      this.translations.find({ where: { pageId: id } }),
      this.sections.find({ where: { pageId: id }, order: { sortOrder: 'ASC', createdAt: 'ASC' } }),
    ]);
    return toDetailDto(page, translations, sections);
  }

  async create(dto: CreatePageDto, options: CreatePageOptions = {}): Promise<PageDetailDto> {
    assertValidPagePath(dto.path);
    if (!dto.translations.vi?.title?.trim()) {
      throw validationFailed([
        { field: 'translations.vi.title', messages: ['The Vietnamese title is required'] },
      ]);
    }
    await this.assertPathFree(dto.path);
    await this.assertOgImagesExist(dto.translations);
    try {
      const page = await this.dataSource.transaction(async (manager) => {
        const created = await manager.save(
          manager.create(Page, {
            path: dto.path,
            templateKey: dto.templateKey ?? 'generic',
            status: PageStatus.DRAFT,
            isSystem: options.isSystem ?? false,
            publishedAt: null,
            currentRevisionNumber: 0,
          }),
        );
        await this.upsertTranslations(manager, created.id, dto.translations);
        return created;
      });
      return this.getDetail(page.id);
    } catch (error) {
      if (isUniqueViolation(error, PATH_CONSTRAINT)) throw this.pathExists(dto.path);
      throw error;
    }
  }

  async update(id: string, dto: UpdatePageDto): Promise<PageDetailDto> {
    if (dto.translations) await this.assertOgImagesExist(dto.translations);
    try {
      await this.dataSource.transaction(async (manager) => {
        const page = await manager.findOne(Page, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!page) throw notFound('Page');
        assertVersionMatches(page.version, dto.version);

        const changes: Partial<Page> = {};
        if (dto.path !== undefined && dto.path !== page.path) {
          if (page.isSystem) {
            throw conflict(PROTECTED_CODE, 'The path of a system page cannot be changed');
          }
          assertValidPagePath(dto.path);
          await this.assertPathFree(dto.path, page.id);
          changes.path = dto.path;
        }
        if (dto.templateKey !== undefined && dto.templateKey !== page.templateKey) {
          if (page.isSystem) {
            throw conflict(PROTECTED_CODE, 'The template of a system page cannot be changed');
          }
          changes.templateKey = dto.templateKey;
        }
        if (dto.translations) await this.upsertTranslations(manager, page.id, dto.translations);
        // update() always bumps the version, also when only translations changed
        await manager.update(
          Page,
          { id: page.id },
          {
            ...changes,
            updatedAt: new Date(),
            updatedById: this.requestContext.userId ?? null,
          },
        );
      });
    } catch (error) {
      if (isUniqueViolation(error, PATH_CONSTRAINT)) throw this.pathExists(dto.path ?? '');
      throw error;
    }
    return this.getDetail(id);
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const page = await manager.findOne(Page, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!page) throw notFound('Page');
      if (page.isSystem) throw conflict(PROTECTED_CODE, 'System pages cannot be deleted');
      const sections = await manager.find(PageSection, { where: { pageId: id } });
      const sectionIds = sections.map((section) => section.id);
      if (sectionIds.length > 0) {
        await manager.delete(PageSectionMedia, { sectionId: In(sectionIds) });
        await manager.softDelete(PageSection, { pageId: id });
      }
      await manager.softDelete(Page, { id });
    });
  }

  async unpublish(id: string): Promise<PageDetailDto> {
    await this.dataSource.transaction(async (manager) => {
      const page = await manager.findOne(Page, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!page) throw notFound('Page');
      if (page.status === PageStatus.PUBLISHED) {
        page.status = PageStatus.DRAFT;
        page.publishedAt = null;
        await manager.save(page);
      }
    });
    return this.getDetail(id);
  }

  async getOrFail(id: string, manager?: EntityManager): Promise<Page> {
    const repository = manager ? manager.getRepository(Page) : this.pages;
    const page = await repository.findOne({ where: { id } });
    if (!page) throw notFound('Page');
    return page;
  }

  private async loadSectionStats(
    pageIds: string[],
  ): Promise<Map<string, { count: number; dirty: boolean }>> {
    const stats = new Map<string, { count: number; dirty: boolean }>();
    if (pageIds.length === 0) return stats;
    const rows = await this.sections
      .createQueryBuilder('s')
      .select('s.pageId', 'pageId')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        'BOOL_OR(s.isVisible AND (s.publishedContent IS NULL OR s.publishedContent IS DISTINCT FROM s.draftContent))',
        'dirty',
      )
      .where('s.pageId IN (:...pageIds)', { pageIds })
      .groupBy('s.pageId')
      .getRawMany<{ pageId: string; count: string; dirty: boolean | null }>();
    for (const row of rows) stats.set(row.pageId, { count: Number(row.count), dirty: !!row.dirty });
    return stats;
  }

  private async assertPathFree(path: string, exceptPageId?: string): Promise<void> {
    const existing = await this.pages.findOne({ where: { path } });
    if (existing && existing.id !== exceptPageId) throw this.pathExists(path);
  }

  private pathExists(path: string) {
    return conflict('PAGE_PATH_EXISTS', `A page with path "${path}" already exists`);
  }

  private async assertOgImagesExist(translations: PageTranslationsInputDto): Promise<void> {
    const ids = SUPPORTED_LOCALES.map((locale) => translations[locale]?.ogImageId).filter(
      (id): id is string => !!id,
    );
    await this.mediaReferences.assertAllExist(ids);
  }

  private async upsertTranslations(
    manager: EntityManager,
    pageId: string,
    input: PageTranslationsInputDto,
  ): Promise<void> {
    const repository = manager.getRepository(PageTranslation);
    for (const locale of [Locale.VI, Locale.EN]) {
      const provided = input[locale];
      if (!provided) continue;
      const row =
        (await repository.findOne({ where: { pageId, locale } })) ??
        repository.create({
          pageId,
          locale,
          title: null,
          seoTitle: null,
          seoDescription: null,
          seoKeywords: null,
          canonicalUrl: null,
          noIndex: false,
          ogImageId: null,
        });
      const target = row as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(provided)) {
        if (value === undefined) continue;
        target[key] = typeof value === 'string' && value.trim() === '' ? null : value;
      }
      await repository.save(row);
    }
  }
}
