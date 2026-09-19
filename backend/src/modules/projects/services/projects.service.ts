import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, In, IsNull } from 'typeorm';
import { ErrorCode } from '../../../common/constants/error-codes';
import { Permission } from '../../../common/constants/permissions';
import { roleHasPermission } from '../../../common/constants/role-permissions';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import {
  conflict,
  forbidden,
  notFound,
  translationMissing,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { assertCanModifyContent } from '../../../common/policies/content-ownership.policy';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { sanitizeRichText } from '../../../common/utils/sanitize-rich-text';
import { generateUniqueSlug } from '../../../common/utils/unique-slug';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import {
  INVALID_STATUS_TRANSITION,
  PROJECT_SLUG_UNIQUE_INDEX,
  PROJECT_SUBMITTED_FOR_REVIEW_EVENT,
  ProjectSubmittedForReviewEvent,
  RESERVED_PROJECT_SLUGS,
} from '../constants/project.constants';
import {
  CreateProjectDto,
  ProjectContentDto,
  ProjectSectionInputDto,
  ProjectTranslationsDto,
  UpdateProjectDto,
} from '../dto/project-input.dto';
import { ListProjectsQueryDto, PROJECT_SORT_FIELDS } from '../dto/project-queries.dto';
import { ProjectDetailResponseDto, ProjectListItemResponseDto } from '../dto/project-response.dto';
import { ProjectCategory } from '../entities/project-category.entity';
import { ProjectImage } from '../entities/project-image.entity';
import { ProjectSectionTranslation } from '../entities/project-section-translation.entity';
import { ProjectSection } from '../entities/project-section.entity';
import { ProjectTranslation } from '../entities/project-translation.entity';
import { Project } from '../entities/project.entity';
import {
  collectProjectMediaIds,
  ProjectAggregate,
  toAdminProjectDetail,
  toAdminProjectListItem,
} from '../mappers/project.mapper';

const TRANSITIONS: Record<PublicationStatus, PublicationStatus[]> = {
  [PublicationStatus.DRAFT]: [
    PublicationStatus.IN_REVIEW,
    PublicationStatus.PUBLISHED,
    PublicationStatus.ARCHIVED,
  ],
  [PublicationStatus.IN_REVIEW]: [
    PublicationStatus.DRAFT,
    PublicationStatus.PUBLISHED,
    PublicationStatus.ARCHIVED,
  ],
  [PublicationStatus.PUBLISHED]: [PublicationStatus.DRAFT, PublicationStatus.ARCHIVED],
  [PublicationStatus.ARCHIVED]: [PublicationStatus.DRAFT],
};

const TEXT_FIELDS = ['title', 'summary'] as const;
const SEO_TEXT_FIELDS = ['seoTitle', 'seoDescription', 'seoKeywords', 'canonicalUrl'] as const;

@Injectable()
export class ProjectsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly media: MediaReferenceService,
    private readonly events: EventEmitter2,
  ) {}

  async list(
    query: ListProjectsQueryDto,
    user: Pick<AuthenticatedUser, 'id'>,
  ): Promise<PaginatedResponseDto<ProjectListItemResponseDto>> {
    const builder = this.dataSource.getRepository(Project).createQueryBuilder('project');
    if (query.status) builder.andWhere('project.status = :status', { status: query.status });
    if (query.categoryId)
      builder.andWhere('project.categoryId = :categoryId', { categoryId: query.categoryId });
    if (query.featured !== undefined) {
      builder.andWhere('project.featured = :featured', { featured: query.featured });
    }
    if (query.mine) builder.andWhere('project.createdById = :userId', { userId: user.id });
    if (query.search) {
      const pattern = containsPattern(query.search);
      builder.andWhere(
        new Brackets((qb) =>
          qb
            .where('project.slug ILIKE :pattern', { pattern })
            .orWhere('project.clientName ILIKE :pattern', { pattern })
            .orWhere(
              `EXISTS (SELECT 1 FROM project_translations translation
                WHERE translation.project_id = project.id AND translation.title ILIKE :pattern)`,
              { pattern },
            ),
        ),
      );
    }
    const sort = resolveSort(query, PROJECT_SORT_FIELDS, 'sortOrder');
    builder.orderBy(`project.${sort.field}`, sort.order).addOrderBy('project.createdAt', 'ASC');

    const page = await paginate(builder, query);
    const translations = page.items.length
      ? await this.dataSource.getRepository(ProjectTranslation).find({
          where: { projectId: In(page.items.map((project) => project.id)) },
        })
      : [];
    const urls = await this.media.resolveUrls(
      page.items.flatMap((project) => (project.thumbnailId ? [project.thumbnailId] : [])),
    );
    return new PaginatedResponseDto(
      page.items.map((project) =>
        toAdminProjectListItem(
          project,
          translations.filter((row) => row.projectId === project.id),
          urls,
        ),
      ),
      page.meta,
    );
  }

  async getById(id: string): Promise<ProjectDetailResponseDto> {
    const project = await this.dataSource.getRepository(Project).findOne({ where: { id } });
    if (!project) throw notFound('Project');
    const aggregate = await this.loadAggregate(this.dataSource.manager, project);
    const urls = await this.media.resolveUrls(collectProjectMediaIds(aggregate));
    return toAdminProjectDetail(aggregate, urls);
  }

  async create(
    dto: CreateProjectDto,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
  ): Promise<ProjectDetailResponseDto> {
    this.assertCanSetPlacement(dto, user);
    const viTitle = dto.translations?.vi?.title?.trim();
    if (!viTitle) {
      throw validationFailed([
        { field: 'translations.vi.title', messages: ['A Vietnamese title is required'] },
      ]);
    }
    this.assertSlugAllowed(dto.slug);
    await this.assertReferences(this.dataSource.manager, dto);

    for (let attempt = 0; attempt < 2; attempt++) {
      const slug = dto.slug ?? (await this.uniqueSlug(viTitle));
      try {
        const id = await this.dataSource.transaction(async (manager) => {
          const rows: { next: string }[] = await manager.query(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM projects WHERE deleted_at IS NULL',
          );
          const project = await manager.save(
            manager.create(Project, {
              slug,
              status: PublicationStatus.DRAFT,
              featured: dto.featured ?? false,
              sortOrder: dto.sortOrder ?? Number(rows[0]?.next ?? 0),
              categoryId: dto.categoryId ?? null,
              thumbnailId: dto.thumbnailId ?? null,
              clientName: dto.clientName ?? null,
              technologies: dto.technologies ?? [],
              demoUrl: dto.demoUrl ?? null,
              videoUrl: dto.videoUrl ?? null,
              hasVideo: dto.hasVideo ?? false,
              videoDuration: dto.videoDuration ?? null,
              completedAt: dto.completedAt ?? null,
              publishedAt: null,
            }),
          );
          await this.writeRelations(manager, project.id, dto);
          return project.id;
        });
        return await this.getById(id);
      } catch (error) {
        if (!isUniqueViolation(error, PROJECT_SLUG_UNIQUE_INDEX)) throw error;
        if (dto.slug || attempt === 1) throw this.slugConflict();
      }
    }
    throw this.slugConflict();
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
  ): Promise<ProjectDetailResponseDto> {
    this.assertSlugAllowed(dto.slug);
    try {
      await this.dataSource.transaction(async (manager) => {
        const project = await this.lockOrFail(manager, id);
        this.assertCanEdit(project, user, dto);
        assertVersionMatches(project.version, dto.version);
        await this.assertReferences(manager, dto);

        if (dto.slug !== undefined) project.slug = dto.slug;
        if (dto.categoryId !== undefined) project.categoryId = dto.categoryId ?? null;
        if (dto.thumbnailId !== undefined) project.thumbnailId = dto.thumbnailId ?? null;
        if (dto.clientName !== undefined) project.clientName = dto.clientName ?? null;
        if (dto.technologies !== undefined) project.technologies = dto.technologies;
        if (dto.demoUrl !== undefined) project.demoUrl = dto.demoUrl ?? null;
        if (dto.videoUrl !== undefined) project.videoUrl = dto.videoUrl ?? null;
        if (dto.hasVideo !== undefined) project.hasVideo = dto.hasVideo;
        if (dto.videoDuration !== undefined) project.videoDuration = dto.videoDuration ?? null;
        if (dto.completedAt !== undefined) project.completedAt = dto.completedAt ?? null;
        if (dto.featured !== undefined) project.featured = dto.featured;
        if (dto.sortOrder !== undefined) project.sortOrder = dto.sortOrder;
        project.updatedAt = new Date();
        await manager.save(project);

        await this.writeRelations(manager, id, dto);
        if (project.status === PublicationStatus.PUBLISHED) {
          this.assertPublishable(await this.loadAggregate(manager, project));
        }
      });
    } catch (error) {
      if (isUniqueViolation(error, PROJECT_SLUG_UNIQUE_INDEX)) throw this.slugConflict();
      throw error;
    }
    return this.getById(id);
  }

  async submitForReview(
    id: string,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
  ): Promise<ProjectDetailResponseDto> {
    const title = await this.transition(id, PublicationStatus.IN_REVIEW, user);
    const project = await this.dataSource.getRepository(Project).findOneByOrFail({ id });
    const event: ProjectSubmittedForReviewEvent = {
      projectId: id,
      title,
      authorId: project.createdById,
    };
    this.events.emit(PROJECT_SUBMITTED_FOR_REVIEW_EVENT, event);
    return this.getById(id);
  }

  async changeStatus(
    id: string,
    target: PublicationStatus,
    requiredCurrent?: PublicationStatus,
  ): Promise<ProjectDetailResponseDto> {
    await this.transition(id, target, undefined, requiredCurrent);
    return this.getById(id);
  }

  async reorder(ids: string[]): Promise<string[]> {
    return this.dataSource.transaction(async (manager) => {
      const all = await manager.find(Project, {
        select: { id: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
      const known = new Set(all.map((item) => item.id));
      const unknown = ids.filter((id) => !known.has(id));
      if (unknown.length > 0) {
        throw validationFailed([
          { field: 'ids', messages: [`Unknown project ids: ${unknown.join(', ')}`] },
        ]);
      }
      const requested = new Set(ids);
      const ordered = [...ids, ...all.map((item) => item.id).filter((id) => !requested.has(id))];
      for (const [index, id] of ordered.entries()) {
        await manager.update(Project, { id }, { sortOrder: index });
      }
      return ordered;
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.dataSource
      .getRepository(Project)
      .softDelete({ id, deletedAt: IsNull() });
    if (!result.affected) throw notFound('Project');
  }

  async loadAggregate(manager: EntityManager, project: Project): Promise<ProjectAggregate> {
    const translations = await manager.find(ProjectTranslation, {
      where: { projectId: project.id },
    });
    const gallery = await manager.find(ProjectImage, {
      where: { projectId: project.id },
      order: { sortOrder: 'ASC' },
    });
    const sections = await manager.find(ProjectSection, {
      where: { projectId: project.id },
      order: { sortOrder: 'ASC' },
    });
    const sectionTranslations = sections.length
      ? await manager.find(ProjectSectionTranslation, {
          where: { sectionId: In(sections.map((section) => section.id)) },
        })
      : [];
    return {
      project,
      translations,
      gallery,
      sections: sections.map((section) => ({
        section,
        translations: sectionTranslations.filter((row) => row.sectionId === section.id),
      })),
    };
  }

  // Returns the vi title of the project for event payloads
  private async transition(
    id: string,
    target: PublicationStatus,
    ownerCheckFor?: Pick<AuthenticatedUser, 'id' | 'role'>,
    requiredCurrent?: PublicationStatus,
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const project = await this.lockOrFail(manager, id);
      if (ownerCheckFor) {
        assertCanModifyContent(
          ownerCheckFor,
          project.createdById,
          Permission.PROJECT_UPDATE_OWN,
          Permission.PROJECT_UPDATE_ANY,
        );
      }
      if (
        (requiredCurrent && project.status !== requiredCurrent) ||
        !TRANSITIONS[project.status].includes(target)
      ) {
        throw conflict(
          INVALID_STATUS_TRANSITION,
          `A ${project.status} project cannot become ${target}`,
        );
      }
      const aggregate = await this.loadAggregate(manager, project);
      if (target === PublicationStatus.PUBLISHED) {
        this.assertPublishable(aggregate);
        project.publishedAt = project.publishedAt ?? new Date();
      }
      if (target === PublicationStatus.DRAFT) project.publishedAt = null;
      project.status = target;
      await manager.save(project);
      return aggregate.translations.find((row) => row.locale === 'vi')?.title ?? '';
    });
  }

  private assertCanEdit(
    project: Project,
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
    dto: ProjectContentDto,
  ): void {
    assertCanModifyContent(
      user,
      project.createdById,
      Permission.PROJECT_UPDATE_OWN,
      Permission.PROJECT_UPDATE_ANY,
    );
    const canEditAny = roleHasPermission(user.role, Permission.PROJECT_UPDATE_ANY);
    if (project.status !== PublicationStatus.DRAFT && !canEditAny) {
      throw forbidden('Only drafts can be edited with project:update-own');
    }
    this.assertCanSetPlacement(dto, user);
  }

  private assertCanSetPlacement(
    dto: ProjectContentDto,
    user: Pick<AuthenticatedUser, 'role'>,
  ): void {
    const canEditAny = roleHasPermission(user.role, Permission.PROJECT_UPDATE_ANY);
    if ((dto.featured !== undefined || dto.sortOrder !== undefined) && !canEditAny) {
      throw forbidden('Featuring and ordering projects needs project:update-any');
    }
  }

  private assertSlugAllowed(slug?: string): void {
    if (slug && RESERVED_PROJECT_SLUGS.includes(slug)) {
      throw validationFailed([{ field: 'slug', messages: ['This slug is reserved'] }]);
    }
  }

  private slugConflict() {
    return conflict(ErrorCode.CONFLICT, 'This slug is already in use');
  }

  private uniqueSlug(title: string): Promise<string> {
    return generateUniqueSlug(
      title,
      async (candidate) =>
        RESERVED_PROJECT_SLUGS.includes(candidate) ||
        (await this.dataSource.getRepository(Project).exists({ where: { slug: candidate } })),
      { fallback: 'project' },
    );
  }

  private async lockOrFail(manager: EntityManager, id: string): Promise<Project> {
    const project = await manager.findOne(Project, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!project) throw notFound('Project');
    return project;
  }

  private async assertReferences(manager: EntityManager, dto: ProjectContentDto): Promise<void> {
    if (dto.categoryId) {
      const exists = await manager.exists(ProjectCategory, { where: { id: dto.categoryId } });
      if (!exists) {
        throw validationFailed([{ field: 'categoryId', messages: ['Unknown project category'] }]);
      }
    }
    const mediaIds: string[] = [];
    if (dto.thumbnailId) mediaIds.push(dto.thumbnailId);
    mediaIds.push(...(dto.galleryMediaIds ?? []));
    for (const locale of SUPPORTED_LOCALES) {
      const ogImageId = dto.translations?.[locale]?.ogImageId;
      if (ogImageId) mediaIds.push(ogImageId);
    }
    await this.media.assertAllExist(mediaIds);
  }

  private async writeRelations(
    manager: EntityManager,
    projectId: string,
    dto: ProjectContentDto,
  ): Promise<void> {
    await this.upsertTranslations(manager, projectId, dto.translations);
    if (dto.galleryMediaIds !== undefined) {
      await manager.delete(ProjectImage, { projectId });
      if (dto.galleryMediaIds.length > 0) {
        await manager.save(
          dto.galleryMediaIds.map((mediaAssetId, index) =>
            manager.create(ProjectImage, { projectId, mediaAssetId, sortOrder: index }),
          ),
        );
      }
    }
    if (dto.sections !== undefined) await this.replaceSections(manager, projectId, dto.sections);
  }

  private async upsertTranslations(
    manager: EntityManager,
    projectId: string,
    input?: ProjectTranslationsDto,
  ): Promise<void> {
    if (!input) return;
    for (const locale of SUPPORTED_LOCALES) {
      const values = input[locale];
      if (!values) continue;
      const row =
        (await manager.findOne(ProjectTranslation, { where: { projectId, locale } })) ??
        manager.create(ProjectTranslation, { projectId, locale });
      for (const field of TEXT_FIELDS) {
        if (values[field] !== undefined) row[field] = values[field] ?? '';
      }
      if (values.descriptionHtml !== undefined) {
        row.descriptionHtml = sanitizeRichText(values.descriptionHtml ?? '');
      }
      if (values.industry !== undefined) row.industry = values.industry ?? null;
      for (const field of SEO_TEXT_FIELDS) {
        if (values[field] !== undefined) row[field] = values[field] ?? null;
      }
      if (values.noIndex !== undefined) row.noIndex = values.noIndex;
      if (values.ogImageId !== undefined) row.ogImageId = values.ogImageId ?? null;
      await manager.save(row);
    }
  }

  private async replaceSections(
    manager: EntityManager,
    projectId: string,
    inputs: ProjectSectionInputDto[],
  ): Promise<void> {
    await manager.delete(ProjectSection, { projectId });
    for (const [index, input] of inputs.entries()) {
      const section = await manager.save(
        manager.create(ProjectSection, { projectId, sortOrder: index }),
      );
      for (const locale of SUPPORTED_LOCALES) {
        const values = input.translations[locale];
        if (!values) continue;
        await manager.save(
          manager.create(ProjectSectionTranslation, {
            sectionId: section.id,
            locale,
            heading: values.heading ?? '',
            bodyHtml: sanitizeRichText(values.bodyHtml ?? ''),
          }),
        );
      }
    }
  }

  private assertPublishable(aggregate: ProjectAggregate): void {
    const missing: { locale: string; field: string }[] = [];
    for (const locale of SUPPORTED_LOCALES) {
      const row = aggregate.translations.find((candidate) => candidate.locale === locale);
      for (const field of TEXT_FIELDS) {
        if (!row?.[field]?.trim()) missing.push({ locale, field });
      }
      aggregate.sections.forEach(({ translations }, index) => {
        const section = translations.find((candidate) => candidate.locale === locale);
        if (!section?.heading.trim()) missing.push({ locale, field: `sections[${index}].heading` });
        if (!section?.bodyHtml.trim())
          missing.push({ locale, field: `sections[${index}].bodyHtml` });
      });
    }
    if (missing.length > 0) throw translationMissing(missing);
  }
}
