import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  conflict,
  notFound,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { CreateSectionDto, ReorderSectionsDto, UpdateSectionDto } from '../dto/page-requests.dto';
import { PageSectionDto } from '../dto/page-responses.dto';
import { PageSection } from '../entities/page-section.entity';
import { Page } from '../entities/page.entity';
import { toSectionDto } from '../mappers/page.mapper';
import { SectionContentService } from './section-content.service';
import { PROTECTED_CODE } from './pages.service';

const SECTION_KEY_CONSTRAINT = 'uq_page_sections_page_key';

export interface AddSectionOptions {
  isSystem?: boolean;
}

@Injectable()
export class PageSectionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly contentService: SectionContentService,
  ) {}

  async add(
    pageId: string,
    dto: CreateSectionDto,
    options: AddSectionOptions = {},
  ): Promise<PageSectionDto> {
    const prepared = await this.contentService.prepare(dto.type, dto.content);
    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        await this.lockPage(manager, pageId);
        const existing = await this.loadOrdered(manager, pageId);
        const sectionKey = dto.sectionKey ?? this.generateKey(dto.type, existing);
        if (existing.some((section) => section.sectionKey === sectionKey)) {
          throw this.keyExists(sectionKey);
        }
        const created = await manager.save(
          manager.create(PageSection, {
            pageId,
            sectionKey,
            type: dto.type,
            sortOrder: existing.length,
            isVisible: dto.isVisible ?? true,
            isSystem: options.isSystem ?? false,
            draftContent: prepared.content,
            publishedContent: null,
          }),
        );
        const position = Math.min(dto.sortOrder ?? existing.length, existing.length);
        const ordered = [...existing];
        ordered.splice(position, 0, created);
        await this.applyOrder(manager, ordered);
        await this.contentService.syncMedia(manager, created);
        return created;
      });
      return toSectionDto(saved);
    } catch (error) {
      if (isUniqueViolation(error, SECTION_KEY_CONSTRAINT)) {
        throw this.keyExists(dto.sectionKey ?? dto.type);
      }
      throw error;
    }
  }

  async update(pageId: string, sectionId: string, dto: UpdateSectionDto): Promise<PageSectionDto> {
    const current = await this.dataSource
      .getRepository(PageSection)
      .findOne({ where: { id: sectionId, pageId } });
    if (!current) throw notFound('Section');
    const prepared =
      dto.content !== undefined
        ? await this.contentService.prepare(current.type, dto.content)
        : null;

    const saved = await this.dataSource.transaction(async (manager) => {
      await this.lockPage(manager, pageId);
      const section = await manager.findOne(PageSection, {
        where: { id: sectionId, pageId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!section) throw notFound('Section');
      assertVersionMatches(section.version, dto.version);

      let structureChanged = false;
      if (prepared) section.draftContent = prepared.content;
      if (dto.isVisible !== undefined && dto.isVisible !== section.isVisible) {
        section.isVisible = dto.isVisible;
        structureChanged = true;
      }
      const saved = await manager.save(section);
      if (prepared) await this.contentService.syncMedia(manager, saved);

      if (dto.sortOrder !== undefined) {
        const ordered = (await this.loadOrdered(manager, pageId)).filter(
          (item) => item.id !== sectionId,
        );
        ordered.splice(Math.min(dto.sortOrder, ordered.length), 0, saved);
        structureChanged = (await this.applyOrder(manager, ordered)) || structureChanged;
      }
      if (structureChanged) await this.touchPage(manager, pageId);
      return manager.findOneOrFail(PageSection, { where: { id: sectionId } });
    });
    return toSectionDto(saved);
  }

  async remove(pageId: string, sectionId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.lockPage(manager, pageId);
      const section = await manager.findOne(PageSection, { where: { id: sectionId, pageId } });
      if (!section) throw notFound('Section');
      if (section.isSystem) {
        throw conflict(PROTECTED_CODE, 'System sections cannot be deleted; hide them instead');
      }
      await this.contentService.releaseMedia(manager, [section.id]);
      await manager.softDelete(PageSection, { id: section.id });
      await this.applyOrder(manager, await this.loadOrdered(manager, pageId));
      await this.touchPage(manager, pageId);
    });
  }

  async reorder(pageId: string, dto: ReorderSectionsDto): Promise<PageSectionDto[]> {
    return this.dataSource.transaction(async (manager) => {
      await this.lockPage(manager, pageId);
      const existing = await this.loadOrdered(manager, pageId);
      const byId = new Map(existing.map((section) => [section.id, section]));
      const sameSet =
        dto.sectionIds.length === existing.length && dto.sectionIds.every((id) => byId.has(id));
      if (!sameSet) {
        throw validationFailed([
          {
            field: 'sectionIds',
            messages: ['sectionIds must list every section of the page exactly once'],
          },
        ]);
      }
      const ordered = dto.sectionIds.map((id) => byId.get(id) as PageSection);
      if (await this.applyOrder(manager, ordered)) await this.touchPage(manager, pageId);
      return (await this.loadOrdered(manager, pageId)).map(toSectionDto);
    });
  }

  // Also used by draft handling in the publishing service
  async loadOrdered(manager: EntityManager, pageId: string): Promise<PageSection[]> {
    return manager.find(PageSection, {
      where: { pageId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  private async applyOrder(manager: EntityManager, ordered: PageSection[]): Promise<boolean> {
    let changed = false;
    for (const [index, section] of ordered.entries()) {
      if (section.sortOrder === index) continue;
      // Direct update: ordering must not bump the section version the editor is holding
      await manager
        .createQueryBuilder()
        .update(PageSection)
        .set({ sortOrder: index, version: () => 'version' })
        .where('id = :id', { id: section.id })
        .execute();
      section.sortOrder = index;
      changed = true;
    }
    return changed;
  }

  private async lockPage(manager: EntityManager, pageId: string): Promise<Page> {
    const page = await manager.findOne(Page, {
      where: { id: pageId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!page) throw notFound('Page');
    return page;
  }

  // Structure (order, visibility, deletion) is live, so the page counts as modified
  private async touchPage(manager: EntityManager, pageId: string): Promise<void> {
    await manager.query('UPDATE "pages" SET "updated_at" = now() WHERE "id" = $1', [pageId]);
  }

  private generateKey(type: string, existing: PageSection[]): string {
    const taken = new Set(existing.map((section) => section.sectionKey));
    if (!taken.has(type)) return type;
    let counter = 2;
    while (taken.has(`${type}-${counter}`)) counter += 1;
    return `${type}-${counter}`;
  }

  private keyExists(sectionKey: string) {
    return conflict(
      'SECTION_KEY_EXISTS',
      `A section with key "${sectionKey}" already exists on this page`,
    );
  }
}
