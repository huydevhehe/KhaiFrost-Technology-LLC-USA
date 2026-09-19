import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Locale } from '../../src/common/enums/locale.enum';
import { PublicationStatus } from '../../src/common/enums/publication-status.enum';
import { Role } from '../../src/common/enums/role.enum';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { ProductCategoryTranslation } from '../../src/modules/products/entities/product-category-translation.entity';
import { ProductCategory } from '../../src/modules/products/entities/product-category.entity';
import { ProductImage } from '../../src/modules/products/entities/product-image.entity';
import { ProductPrice } from '../../src/modules/products/entities/product-price.entity';
import { ProductTranslation } from '../../src/modules/products/entities/product-translation.entity';
import { Product } from '../../src/modules/products/entities/product.entity';
import { BillingPeriod } from '../../src/modules/products/enums/billing-period.enum';
import { Currency } from '../../src/modules/products/enums/currency.enum';
import { ProductType } from '../../src/modules/products/enums/product-type.enum';
import { asTestUser, TestUser } from '../support/test-authentication.guard';

export const PRODUCT_ENTITIES = [
  MediaAsset,
  Product,
  ProductTranslation,
  ProductPrice,
  ProductImage,
  ProductCategory,
  ProductCategoryTranslation,
];

export const TEST_USERS = {
  admin: { id: '00000000-0000-4000-8000-0000000000a1', role: Role.ADMIN },
  staff: { id: '00000000-0000-4000-8000-0000000000b1', role: Role.STAFF },
  otherStaff: { id: '00000000-0000-4000-8000-0000000000b2', role: Role.STAFF },
  customer: { id: '00000000-0000-4000-8000-0000000000c1', role: Role.CUSTOMER },
  otherCustomer: { id: '00000000-0000-4000-8000-0000000000c2', role: Role.CUSTOMER },
} satisfies Record<string, TestUser>;

export const as = (user: TestUser): Record<string, string> => asTestUser(user);

export interface SeedPrice {
  currency: Currency;
  amount: string;
  billingPeriod: BillingPeriod;
  isDefault?: boolean;
}

export interface SeedProductOptions {
  slug?: string;
  type?: ProductType;
  status?: PublicationStatus;
  publishedAt?: Date | null;
  priceOnRequest?: boolean;
  prices?: SeedPrice[];
  names?: { vi: string; en: string };
  categoryId?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
  coverImageId?: string | null;
  galleryImageIds?: string[];
  demoUrl?: string | null;
  createdById?: string | null;
  deletedAt?: Date | null;
}

export interface SeededProduct {
  product: Product;
  prices: ProductPrice[];
}

const ONE_MINUTE_MS = 60_000;

export const usdOneTime = (amount = '100.00'): SeedPrice => ({
  currency: Currency.USD,
  amount,
  billingPeriod: BillingPeriod.ONE_TIME,
});

export async function seedProduct(
  dataSource: DataSource,
  options: SeedProductOptions = {},
): Promise<SeededProduct> {
  const suffix = randomUUID().slice(0, 8);
  const status = options.status ?? PublicationStatus.PUBLISHED;
  const type = options.type ?? ProductType.SOURCE_CODE;
  const product = await dataSource.getRepository(Product).save(
    dataSource.getRepository(Product).create({
      slug: options.slug ?? `product-${suffix}`,
      type,
      status,
      publishedAt:
        options.publishedAt !== undefined
          ? options.publishedAt
          : status === PublicationStatus.PUBLISHED
            ? new Date(Date.now() - ONE_MINUTE_MS)
            : null,
      isFeatured: options.isFeatured ?? false,
      sortOrder: options.sortOrder ?? 0,
      categoryId: options.categoryId ?? null,
      coverImageId: options.coverImageId ?? null,
      demoUrl: options.demoUrl ?? null,
      priceOnRequest: options.priceOnRequest ?? false,
      techStack: ['NestJS'],
      specifications: {},
      createdById: options.createdById ?? null,
      deletedAt: options.deletedAt ?? null,
    }),
  );

  const names = options.names ?? { vi: `San pham ${suffix}`, en: `Product ${suffix}` };
  const translations = dataSource.getRepository(ProductTranslation);
  for (const locale of [Locale.VI, Locale.EN]) {
    await translations.save(
      translations.create({
        productId: product.id,
        locale,
        name: names[locale],
        tagline: `Tagline ${locale}`,
        descriptionHtml: `<p>Description ${locale}</p>`,
        features: [`Feature ${locale}`],
      }),
    );
  }

  const priceRepository = dataSource.getRepository(ProductPrice);
  const priceInputs = options.prices ?? (options.priceOnRequest ? [] : [usdOneTime()]);
  const prices: ProductPrice[] = [];
  const currenciesWithDefault = new Set<string>();
  for (const price of priceInputs) {
    const isDefault = price.isDefault ?? !currenciesWithDefault.has(price.currency);
    if (isDefault) currenciesWithDefault.add(price.currency);
    prices.push(
      await priceRepository.save(
        priceRepository.create({ productId: product.id, ...price, isDefault }),
      ),
    );
  }

  const gallery = options.galleryImageIds ?? [];
  for (const [sortOrder, mediaAssetId] of gallery.entries()) {
    await dataSource
      .getRepository(ProductImage)
      .save({ productId: product.id, mediaAssetId, sortOrder });
  }
  return { product, prices };
}

export async function seedMediaAsset(dataSource: DataSource): Promise<MediaAsset> {
  const repository = dataSource.getRepository(MediaAsset);
  return repository.save(
    repository.create({
      originalName: 'image.png',
      storageKey: `products/${randomUUID()}.png`,
      mimeType: 'image/png',
      sizeBytes: 10,
      width: 10,
      height: 10,
      checksumSha256: 'a'.repeat(64),
      folder: null,
      variants: {},
    }),
  );
}

export async function seedCategory(
  dataSource: DataSource,
  slug: string,
  names: { vi: string; en: string },
  options: { isActive?: boolean; sortOrder?: number } = {},
): Promise<ProductCategory> {
  const category = await dataSource
    .getRepository(ProductCategory)
    .save(
      dataSource
        .getRepository(ProductCategory)
        .create({ slug, isActive: options.isActive ?? true, sortOrder: options.sortOrder ?? 0 }),
    );
  const translations = dataSource.getRepository(ProductCategoryTranslation);
  for (const locale of [Locale.VI, Locale.EN]) {
    await translations.save(
      translations.create({
        categoryId: category.id,
        locale,
        name: names[locale],
        description: null,
      }),
    );
  }
  return category;
}

export function validCreatePayload(overrides: Record<string, unknown> = {}) {
  return {
    type: ProductType.SOURCE_CODE,
    translations: {
      vi: {
        name: 'Shop Source Code',
        tagline: 'Tagline vi',
        descriptionHtml: '<p>Mo ta</p>',
      },
      en: {
        name: 'Shop Source Code EN',
        tagline: 'Tagline en',
        descriptionHtml: '<p>Description</p>',
      },
    },
    prices: [{ currency: Currency.USD, amount: '199.00', billingPeriod: BillingPeriod.ONE_TIME }],
    ...overrides,
  };
}
