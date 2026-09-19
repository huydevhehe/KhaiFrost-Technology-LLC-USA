import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { conflict, notFound } from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { POST_CATEGORY_SLUG_UNIQUE_INDEX } from '../constants/post-constraints';
import { PostErrorCode } from '../constants/post-error-codes';
import {
  CreatePostCategoryDto,
  PostCategoryTranslationInputDto,
  UpdatePostCategoryDto,
} from '../dto/post-category-input.dto';
import { AdminPostCategoryResponse } from '../dto/post-admin-response.dto';
import { PublicPostCategoryResponse } from '../dto/post-public-response.dto';
import { PostCategoryTranslation } from '../entities/post-category-translation.entity';
import { PostCategory } from '../entities/post-category.entity';
import { Post } from '../entities/post.entity';
import { toAdminCategory, toPublicCategory } from '../mappers/post.mapper';
import { toPlainText } from '../utils/post-content';
import { executeWithUniqueSlug } from '../utils/unique-slug-execution';

@Injectable()
export class PostCategoriesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PostCategory) private readonly categories: Repository<PostCategory>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
  ) {}

  async listForAdmin(): Promise<AdminPostCategoryResponse[]> {
    const categories = await this.categories.find({
      relations: { translations: true },
      order: { sortOrder: 'ASC', slug: 'ASC' },
    });
    const counts = await this.countPostsByCategory();
    return categories.map((category) => toAdminCategory(category, counts.get(category.id) ?? 0));
  }

  async getForAdmin(id: string): Promise<AdminPostCategoryResponse> {
    const category = await this.categories.findOne({
      where: { id },
      relations: { translations: true },
    });
    if (!category) throw notFound('Post category');
    const count = await this.posts.count({ where: { categoryId: id } });
    return toAdminCategory(category, count);
  }

  async create(dto: CreatePostCategoryDto): Promise<AdminPostCategoryResponse> {
    const viName = toPlainText(dto.translations.vi.name);
    const id = await executeWithUniqueSlug({
      suppliedSlug: dto.slug,
      sourceText: viName,
      uniqueIndexName: POST_CATEGORY_SLUG_UNIQUE_INDEX,
      isTaken: (slug) => this.categories.exists({ where: { slug } }),
      execute: (slug) =>
        this.dataSource.transaction(async (manager) => {
          const category = await manager.save(
            manager.create(PostCategory, {
              slug,
              sortOrder: dto.sortOrder ?? 0,
              isActive: dto.isActive ?? true,
            }),
          );
          await this.saveTranslations(manager, category.id, dto.translations);
          return category.id;
        }),
    });
    return this.getForAdmin(id);
  }

  async update(id: string, dto: UpdatePostCategoryDto): Promise<AdminPostCategoryResponse> {
    const apply = (slug?: string) =>
      this.dataSource.transaction(async (manager) => {
        const category = await manager.findOne(PostCategory, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!category) throw notFound('Post category');
        assertVersionMatches(category.version, dto.version);

        if (slug) category.slug = slug;
        if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
        if (dto.isActive !== undefined) category.isActive = dto.isActive;
        // An explicit updatedAt makes the row change even when only translations differ, bumping the version
        category.updatedAt = new Date();
        await manager.save(category);
        if (dto.translations) await this.saveTranslations(manager, id, dto.translations);
        return id;
      });

    const current = await this.categories.findOne({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!current) throw notFound('Post category');
    if (dto.slug && dto.slug !== current.slug) {
      await executeWithUniqueSlug({
        suppliedSlug: dto.slug,
        sourceText: dto.slug,
        uniqueIndexName: POST_CATEGORY_SLUG_UNIQUE_INDEX,
        isTaken: (slug) => this.categories.exists({ where: { slug } }),
        execute: (slug) => apply(slug),
      });
    } else {
      await apply();
    }
    return this.getForAdmin(id);
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const category = await manager.findOne(PostCategory, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!category) throw notFound('Post category');
      const postCount = await manager.count(Post, { where: { categoryId: id } });
      if (postCount > 0) {
        throw conflict(
          PostErrorCode.CATEGORY_IN_USE,
          'This category still has posts; move or delete them first',
          { postCount },
        );
      }
      await manager.softDelete(PostCategory, id);
    });
  }

  async listForPublic(locale: Locale): Promise<PublicPostCategoryResponse[]> {
    const categories = await this.categories
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.translations', 'translation')
      .where('category.isActive = true')
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.slug', 'ASC')
      .getMany();
    const counts = await this.countPostsByCategory({ visibleOnly: true });
    return categories.map((category) =>
      toPublicCategory(category, locale, counts.get(category.id) ?? 0),
    );
  }

  private async countPostsByCategory(
    options: { visibleOnly?: boolean } = {},
  ): Promise<Map<string, number>> {
    const builder = this.posts
      .createQueryBuilder('post')
      .select('post.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'total')
      .where('post.categoryId IS NOT NULL')
      .groupBy('post.categoryId');
    if (options.visibleOnly) {
      builder.andWhere('post.status = :status AND post.publishedAt <= NOW()', {
        status: PublicationStatus.PUBLISHED,
      });
    }
    const rows = await builder.getRawMany<{ categoryId: string; total: string }>();
    return new Map(rows.map((row) => [row.categoryId, Number(row.total)]));
  }

  private async saveTranslations(
    manager: EntityManager,
    categoryId: string,
    translations: Record<Locale, PostCategoryTranslationInputDto>,
  ): Promise<void> {
    const existing = await manager.find(PostCategoryTranslation, { where: { categoryId } });
    for (const locale of SUPPORTED_LOCALES) {
      const input = translations[locale];
      const row =
        existing.find((item) => item.locale === locale) ??
        manager.create(PostCategoryTranslation, { categoryId, locale });
      row.name = toPlainText(input.name);
      row.description = input.description ? toPlainText(input.description) : null;
      await manager.save(row);
    }
  }
}
