import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { paginate } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Locale } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { notFound } from '../../../common/exceptions/exception.factories';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import { PublicProjectListQueryDto } from '../dto/project-queries.dto';
import {
  PublicProjectCardResponseDto,
  PublicProjectCategoryResponseDto,
  PublicProjectDetailResponseDto,
} from '../dto/project-response.dto';
import { ProjectCategoryTranslation } from '../entities/project-category-translation.entity';
import { ProjectCategory } from '../entities/project-category.entity';
import { ProjectTranslation } from '../entities/project-translation.entity';
import { Project } from '../entities/project.entity';
import {
  CategoryLabel,
  categoryLabel,
  collectProjectMediaIds,
  toPublicProjectCard,
  toPublicProjectDetail,
} from '../mappers/project.mapper';
import { ProjectsService } from './projects.service';

@Injectable()
export class PublicProjectsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly media: MediaReferenceService,
    private readonly projects: ProjectsService,
  ) {}

  async list(
    query: PublicProjectListQueryDto,
  ): Promise<PaginatedResponseDto<PublicProjectCardResponseDto>> {
    const builder = this.dataSource
      .getRepository(Project)
      .createQueryBuilder('project')
      .where('project.status = :status', { status: PublicationStatus.PUBLISHED });
    if (query.category) {
      const category = await this.dataSource
        .getRepository(ProjectCategory)
        .findOne({ where: { slug: query.category } });
      if (!category) return paginate([[], 0], query);
      builder.andWhere('project.categoryId = :categoryId', { categoryId: category.id });
    }
    if (query.featured !== undefined) {
      builder.andWhere('project.featured = :featured', { featured: query.featured });
    }
    builder
      .orderBy('project.sortOrder', 'ASC')
      .addOrderBy('project.completedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('project.createdAt', 'ASC');

    const page = await paginate(builder, query);
    const translations = page.items.length
      ? await this.dataSource.getRepository(ProjectTranslation).find({
          where: { projectId: In(page.items.map((project) => project.id)), locale: query.locale },
        })
      : [];
    const labels = await this.categoryLabels(
      page.items.flatMap((project) => (project.categoryId ? [project.categoryId] : [])),
      query.locale,
    );
    const urls = await this.media.resolveUrls(
      page.items.flatMap((project) => (project.thumbnailId ? [project.thumbnailId] : [])),
    );
    return new PaginatedResponseDto(
      page.items.map((project) =>
        toPublicProjectCard(
          project,
          translations.find((row) => row.projectId === project.id),
          project.categoryId ? (labels.get(project.categoryId) ?? null) : null,
          urls,
        ),
      ),
      page.meta,
    );
  }

  async listSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
    const rows = await this.dataSource.getRepository(Project).find({
      select: { slug: true, updatedAt: true },
      where: { status: PublicationStatus.PUBLISHED },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return rows.map((row) => ({ slug: row.slug, updatedAt: row.updatedAt }));
  }

  async listCategories(locale: Locale): Promise<PublicProjectCategoryResponseDto[]> {
    const categories = await this.dataSource.getRepository(ProjectCategory).find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (categories.length === 0) return [];
    const labels = await this.categoryLabels(
      categories.map((category) => category.id),
      locale,
    );
    const counts: { category_id: string; count: string }[] = await this.dataSource
      .getRepository(Project)
      .createQueryBuilder('project')
      .select('project.category_id', 'category_id')
      .addSelect('COUNT(*)', 'count')
      .where('project.status = :status', { status: PublicationStatus.PUBLISHED })
      .andWhere('project.category_id IS NOT NULL')
      .groupBy('project.category_id')
      .getRawMany();
    return categories.map((category) => ({
      slug: category.slug,
      name: labels.get(category.id)?.name ?? '',
      projectCount: Number(counts.find((row) => row.category_id === category.id)?.count ?? 0),
    }));
  }

  async getBySlug(slug: string, locale: Locale): Promise<PublicProjectDetailResponseDto> {
    const project = await this.dataSource
      .getRepository(Project)
      .findOne({ where: { slug, status: PublicationStatus.PUBLISHED } });
    if (!project) throw notFound('Project');
    const aggregate = await this.projects.loadAggregate(this.dataSource.manager, project);
    const urls = await this.media.resolveUrls(collectProjectMediaIds(aggregate));
    const labels = await this.categoryLabels(
      project.categoryId ? [project.categoryId] : [],
      locale,
    );
    return toPublicProjectDetail(
      aggregate,
      locale,
      project.categoryId ? (labels.get(project.categoryId) ?? null) : null,
      urls,
    );
  }

  private async categoryLabels(ids: string[], locale: Locale): Promise<Map<string, CategoryLabel>> {
    const labels = new Map<string, CategoryLabel>();
    if (ids.length === 0) return labels;
    const categories = await this.dataSource
      .getRepository(ProjectCategory)
      .find({ where: { id: In([...new Set(ids)]) } });
    const translations = await this.dataSource.getRepository(ProjectCategoryTranslation).find({
      where: { categoryId: In(categories.map((category) => category.id)), locale },
    });
    for (const category of categories) {
      const label = categoryLabel(
        category,
        translations.filter((row) => row.categoryId === category.id),
        locale,
      );
      if (label) labels.set(category.id, label);
    }
    return labels;
  }
}
