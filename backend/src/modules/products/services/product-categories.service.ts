import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  conflict,
  notFound,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { generateUniqueSlug } from '../../../common/utils/unique-slug';
import {
  CreateProductCategoryDto,
  ProductCategoryTranslationPatchDto,
  UpdateProductCategoryDto,
} from '../dto/product-category.dto';
import { AdminProductCategoryDto, PublicProductCategoryDto } from '../dto/product-response.dto';
import { ProductCategoryTranslation } from '../entities/product-category-translation.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { Product } from '../entities/product.entity';
import { VISIBLE_PRODUCT_CONDITION, VISIBLE_PRODUCT_PARAMETERS } from '../utils/product-visibility';

const SLUG_INDEX = 'uq_product_categories_slug';
const LIST_LIMIT = 500;

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ProductCategory) private readonly categories: Repository<ProductCategory>,
    @InjectRepository(ProductCategoryTranslation)
    private readonly translations: Repository<ProductCategoryTranslation>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async listAdmin(): Promise<AdminProductCategoryDto[]> {
    const categories = await this.categories.find({
      order: { sortOrder: 'ASC', slug: 'ASC' },
      take: LIST_LIMIT,
    });
    return this.toAdminDtos(categories);
  }

  async getAdmin(id: string): Promise<AdminProductCategoryDto> {
    const category = await this.categories.findOne({ where: { id } });
    if (!category) throw notFound('Product category');
    return (await this.toAdminDtos([category]))[0];
  }

  async create(dto: CreateProductCategoryDto): Promise<AdminProductCategoryDto> {
    const attempt = () =>
      this.dataSource.transaction(async (manager) => {
        const slug = dto.slug
          ? await this.assertSlugFree(manager, dto.slug)
          : await generateUniqueSlug(dto.translations.vi.name, (candidate) =>
              manager.exists(ProductCategory, { where: { slug: candidate } }),
            );
        const category = await manager.save(
          manager.create(ProductCategory, {
            slug,
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
          }),
        );
        await this.upsertTranslations(manager, category.id, {
          vi: dto.translations.vi,
          en: dto.translations.en,
        });
        return category.id;
      });

    let id: string;
    try {
      id = await attempt();
    } catch (error) {
      if (!dto.slug && isUniqueViolation(error, SLUG_INDEX)) id = await attempt();
      else throw this.translateUniqueViolation(error) ?? error;
    }
    return this.getAdmin(id);
  }

  async update(id: string, dto: UpdateProductCategoryDto): Promise<AdminProductCategoryDto> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const category = await manager
          .createQueryBuilder(ProductCategory, 'category')
          .setLock('pessimistic_write')
          .where('category.id = :id', { id })
          .getOne();
        if (!category) throw notFound('Product category');
        assertVersionMatches(category.version, dto.version);
        if (dto.slug !== undefined && dto.slug !== category.slug) {
          await this.assertSlugFree(manager, dto.slug);
        }
        if (dto.slug === null || dto.sortOrder === null || dto.isActive === null) {
          throw validationFailed([{ field: 'slug', messages: ['Fields cannot be null'] }]);
        }
        // An update statement always bumps updatedAt and version, even if only translations changed
        await manager.update(
          ProductCategory,
          { id },
          {
            ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
            ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          },
        );
        await this.upsertTranslations(manager, id, {
          vi: dto.translations?.vi,
          en: dto.translations?.en,
        });
      });
    } catch (error) {
      throw this.translateUniqueViolation(error) ?? error;
    }
    return this.getAdmin(id);
  }

  async remove(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const category = await manager.findOne(ProductCategory, { where: { id } });
      if (!category) throw notFound('Product category');
      const usage = await manager.count(Product, { where: { categoryId: id } });
      if (usage > 0) {
        throw conflict('CATEGORY_IN_USE', 'Move or delete the products in this category first', {
          productCount: usage,
        });
      }
      await manager.softDelete(ProductCategory, { id });
    });
  }

  async listPublic(locale: Locale): Promise<PublicProductCategoryDto[]> {
    const categories = await this.categories.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', slug: 'ASC' },
      take: LIST_LIMIT,
    });
    if (categories.length === 0) return [];
    const ids = categories.map((category) => category.id);
    const [translationRows, countRows] = await Promise.all([
      this.translations.find({ where: { categoryId: In(ids) } }),
      this.products
        .createQueryBuilder('product')
        .select('product.categoryId', 'categoryId')
        .addSelect('COUNT(*)', 'total')
        .where(VISIBLE_PRODUCT_CONDITION, VISIBLE_PRODUCT_PARAMETERS)
        .andWhere('product.categoryId IN (:...ids)', { ids })
        .groupBy('product.categoryId')
        .getRawMany<{ categoryId: string; total: string }>(),
    ]);
    const counts = new Map(countRows.map((row) => [row.categoryId, Number(row.total)]));
    return categories.map((category) => {
      const rows = translationRows.filter((row) => row.categoryId === category.id);
      const chosen =
        rows.find((row) => row.locale === locale) ??
        rows.find((row) => row.locale === Locale.VI) ??
        rows[0];
      return {
        slug: category.slug,
        name: chosen?.name ?? category.slug,
        description: chosen?.description ?? null,
        productCount: counts.get(category.id) ?? 0,
      };
    });
  }

  private async toAdminDtos(categories: ProductCategory[]): Promise<AdminProductCategoryDto[]> {
    if (categories.length === 0) return [];
    const rows = await this.translations.find({
      where: { categoryId: In(categories.map((category) => category.id)) },
    });
    return categories.map((category) => {
      const translations: AdminProductCategoryDto['translations'] = {};
      for (const row of rows.filter((item) => item.categoryId === category.id)) {
        translations[row.locale] = { name: row.name, description: row.description };
      }
      return {
        id: category.id,
        slug: category.slug,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        translations,
        version: category.version,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
    });
  }

  private async upsertTranslations(
    manager: EntityManager,
    categoryId: string,
    patches: Partial<Record<Locale, ProductCategoryTranslationPatchDto | undefined>>,
  ): Promise<void> {
    const existing = await manager.find(ProductCategoryTranslation, { where: { categoryId } });
    for (const locale of SUPPORTED_LOCALES) {
      const patch = patches[locale];
      if (!patch) continue;
      const row =
        existing.find((item) => item.locale === locale) ??
        manager.create(ProductCategoryTranslation, { categoryId, locale, description: null });
      if (patch.name !== undefined) row.name = patch.name.trim();
      if (!row.name) {
        throw validationFailed([
          { field: `translations.${locale}.name`, messages: ['name is required'] },
        ]);
      }
      if (patch.description !== undefined) row.description = patch.description?.trim() || null;
      await manager.save(ProductCategoryTranslation, row);
    }
  }

  private async assertSlugFree(manager: EntityManager, slug: string): Promise<string> {
    if (await manager.exists(ProductCategory, { where: { slug } })) {
      throw conflict('SLUG_TAKEN', 'This slug is already in use');
    }
    return slug;
  }

  private translateUniqueViolation(error: unknown): Error | null {
    return isUniqueViolation(error, SLUG_INDEX)
      ? conflict('SLUG_TAKEN', 'This slug is already in use')
      : null;
  }
}
