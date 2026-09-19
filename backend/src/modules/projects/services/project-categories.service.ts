import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { ErrorCode } from '../../../common/constants/error-codes';
import { SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  conflict,
  notFound,
  translationMissing,
} from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { generateUniqueSlug } from '../../../common/utils/unique-slug';
import { PROJECT_CATEGORY_SLUG_UNIQUE_INDEX } from '../constants/project.constants';
import {
  CreateProjectCategoryDto,
  ProjectCategoryTranslationsDto,
  UpdateProjectCategoryDto,
} from '../dto/project-category.dto';
import { ProjectCategoryResponseDto } from '../dto/project-response.dto';
import { ProjectCategoryTranslation } from '../entities/project-category-translation.entity';
import { ProjectCategory } from '../entities/project-category.entity';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectCategoriesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(): Promise<ProjectCategoryResponseDto[]> {
    const categories = await this.dataSource.getRepository(ProjectCategory).find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (categories.length === 0) return [];
    const translations = await this.dataSource.getRepository(ProjectCategoryTranslation).find({
      where: { categoryId: In(categories.map((category) => category.id)) },
    });
    return categories.map((category) =>
      this.toResponse(
        category,
        translations.filter((row) => row.categoryId === category.id),
      ),
    );
  }

  async getById(id: string): Promise<ProjectCategoryResponseDto> {
    const category = await this.dataSource
      .getRepository(ProjectCategory)
      .findOne({ where: { id } });
    if (!category) throw notFound('Project category');
    const translations = await this.dataSource
      .getRepository(ProjectCategoryTranslation)
      .find({ where: { categoryId: id } });
    return this.toResponse(category, translations);
  }

  async create(dto: CreateProjectCategoryDto): Promise<ProjectCategoryResponseDto> {
    this.assertBothNames(dto.translations);
    const viName = dto.translations.vi?.name?.trim() ?? '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const slug =
        dto.slug ??
        (await generateUniqueSlug(
          viName,
          (candidate) =>
            this.dataSource.getRepository(ProjectCategory).exists({ where: { slug: candidate } }),
          { fallback: 'category' },
        ));
      try {
        const id = await this.dataSource.transaction(async (manager) => {
          const rows: { next: string }[] = await manager.query(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM project_categories WHERE deleted_at IS NULL',
          );
          const category = await manager.save(
            manager.create(ProjectCategory, {
              slug,
              sortOrder: dto.sortOrder ?? Number(rows[0]?.next ?? 0),
            }),
          );
          await this.upsertTranslations(manager, category.id, dto.translations);
          return category.id;
        });
        return await this.getById(id);
      } catch (error) {
        if (!isUniqueViolation(error, PROJECT_CATEGORY_SLUG_UNIQUE_INDEX)) throw error;
        if (dto.slug || attempt === 1) throw this.slugConflict();
      }
    }
    throw this.slugConflict();
  }

  async update(id: string, dto: UpdateProjectCategoryDto): Promise<ProjectCategoryResponseDto> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const category = await manager.findOne(ProjectCategory, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!category) throw notFound('Project category');
        assertVersionMatches(category.version, dto.version);
        if (dto.slug !== undefined) category.slug = dto.slug;
        if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
        category.updatedAt = new Date();
        await manager.save(category);
        await this.upsertTranslations(manager, id, dto.translations);
        const rows = await manager.find(ProjectCategoryTranslation, { where: { categoryId: id } });
        this.assertBothNames(
          Object.fromEntries(rows.map((row) => [row.locale, { name: row.name }])),
        );
      });
    } catch (error) {
      if (isUniqueViolation(error, PROJECT_CATEGORY_SLUG_UNIQUE_INDEX)) throw this.slugConflict();
      throw error;
    }
    return this.getById(id);
  }

  async remove(id: string): Promise<void> {
    const inUse = await this.dataSource
      .getRepository(Project)
      .exists({ where: { categoryId: id } });
    if (inUse) {
      throw conflict(ErrorCode.CONFLICT, 'Projects still use this category; move them first');
    }
    const result = await this.dataSource
      .getRepository(ProjectCategory)
      .softDelete({ id, deletedAt: IsNull() });
    if (!result.affected) throw notFound('Project category');
  }

  private slugConflict() {
    return conflict(ErrorCode.CONFLICT, 'This slug is already in use');
  }

  private assertBothNames(input: ProjectCategoryTranslationsDto | Record<string, unknown>): void {
    const missing = SUPPORTED_LOCALES.filter((locale) => {
      const values = (input as Record<string, { name?: string | null } | undefined>)[locale];
      return !values?.name?.trim();
    }).map((locale) => ({ locale, field: 'name' }));
    if (missing.length > 0) throw translationMissing(missing);
  }

  private async upsertTranslations(
    manager: EntityManager,
    categoryId: string,
    input?: ProjectCategoryTranslationsDto,
  ): Promise<void> {
    if (!input) return;
    for (const locale of SUPPORTED_LOCALES) {
      const values = input[locale];
      if (!values || values.name === undefined) continue;
      const row =
        (await manager.findOne(ProjectCategoryTranslation, { where: { categoryId, locale } })) ??
        manager.create(ProjectCategoryTranslation, { categoryId, locale });
      row.name = values.name ?? '';
      await manager.save(row);
    }
  }

  private toResponse(
    category: ProjectCategory,
    translations: ProjectCategoryTranslation[],
  ): ProjectCategoryResponseDto {
    const byLocale: ProjectCategoryResponseDto['translations'] = {};
    for (const row of translations) byLocale[row.locale] = { name: row.name };
    return {
      id: category.id,
      slug: category.slug,
      sortOrder: category.sortOrder,
      version: category.version,
      translations: byLocale,
    };
  }
}
