import { CreateProductCategoryDto } from '../../../modules/products/dto/product-category.dto';
import { ProductCategory } from '../../../modules/products/entities/product-category.entity';
import { ProductCategoriesService } from '../../../modules/products/services/product-categories.service';
import { PRODUCT_CATEGORIES } from '../seed-content-mapping';
import { SeedContext, Seeder, SeederSummary } from '../seed.types';
import { SummaryBuilder } from '../support/summary-builder';
import { assertValidDto } from '../support/validate-dto';

// The frontend has no product content, so this only prepares the categories the shop will use
export class ProductsSeeder implements Seeder {
  readonly name = 'products';
  readonly description = 'Product categories only (no product content exists in the frontend)';
  readonly dependsOn: readonly string[] = [];

  async run(context: SeedContext): Promise<SeederSummary> {
    const builder = new SummaryBuilder(context);
    const service = context.services.get(ProductCategoriesService);
    const rows = context.dataSource.getRepository(ProductCategory);

    for (const [index, category] of PRODUCT_CATEGORIES.entries()) {
      const dto = {
        slug: category.slug,
        sortOrder: index,
        isActive: true,
        translations: {
          vi: { name: category.vi, description: category.descriptionVi },
          en: { name: category.en, description: category.descriptionEn },
        },
      };
      await builder.item(`product category ${category.slug}`, {
        exists: () => rows.exists({ where: { slug: category.slug }, withDeleted: true }),
        create: () => service.create(dto),
        validate: () => assertValidDto(CreateProductCategoryDto, dto),
      });
    }
    builder.note('No products created: the frontend has no product content');
    return builder.summary;
  }
}
