import request from 'supertest';
import { PublicationStatus } from '../../src/common/enums/publication-status.enum';
import { Product } from '../../src/modules/products/entities/product.entity';
import { ProductTranslation } from '../../src/modules/products/entities/product-translation.entity';
import { BillingPeriod } from '../../src/modules/products/enums/billing-period.enum';
import { Currency } from '../../src/modules/products/enums/currency.enum';
import { DemoMode } from '../../src/modules/products/enums/demo-mode.enum';
import { ProductType } from '../../src/modules/products/enums/product-type.enum';
import { ProductsModule } from '../../src/modules/products/products.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import {
  PRODUCT_ENTITIES,
  seedCategory,
  seedMediaAsset,
  seedProduct,
  usdOneTime,
} from './product-test-helpers';

interface Card {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  prices: { currency: string; amount: string }[];
}

describe('Products public API', () => {
  let context: ModuleTestingContext;
  const server = () => context.app.getHttpServer();
  const get = (path: string) => request(server()).get(`/api/v1/public${path}`);

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: PRODUCT_ENTITIES,
      imports: [ProductsModule],
    });
  });

  afterAll(async () => {
    await context.close();
  });

  it('is reachable without authentication and returns only published, already-live products', async () => {
    const live = await seedProduct(context.dataSource, { slug: 'vis-live' });
    await seedProduct(context.dataSource, { slug: 'vis-draft', status: PublicationStatus.DRAFT });
    await seedProduct(context.dataSource, {
      slug: 'vis-review',
      status: PublicationStatus.IN_REVIEW,
    });
    await seedProduct(context.dataSource, {
      slug: 'vis-archived',
      status: PublicationStatus.ARCHIVED,
    });
    await seedProduct(context.dataSource, {
      slug: 'vis-scheduled',
      publishedAt: new Date(Date.now() + 3_600_000),
    });
    await seedProduct(context.dataSource, { slug: 'vis-deleted', deletedAt: new Date() });

    const list = await get('/products?search=vis-').expect(200);
    expect(list.body.data.map((card: Card) => card.slug)).toEqual([live.product.slug]);
    expect(list.body.meta.total).toBe(1);

    for (const slug of [
      'vis-draft',
      'vis-review',
      'vis-archived',
      'vis-scheduled',
      'vis-deleted',
    ]) {
      const response = await get(`/products/${slug}`).expect(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    }
    await get('/products/vis-live').expect(200);

    const slugs = await get('/products/slugs').expect(200);
    const slugValues = slugs.body.data.map((item: { slug: string }) => item.slug);
    expect(slugValues).toContain('vis-live');
    expect(slugValues).not.toContain('vis-draft');
    expect(slugValues).not.toContain('vis-scheduled');
  });

  it('returns the requested locale, defaults to vi and rejects unknown locales', async () => {
    await seedProduct(context.dataSource, {
      slug: 'loc-product',
      names: { vi: 'Ten tieng Viet', en: 'English name' },
    });
    const en = await get('/products/loc-product?locale=en').expect(200);
    expect(en.body.data).toMatchObject({ name: 'English name', tagline: 'Tagline en' });
    expect(en.body.data.descriptionHtml).toBe('<p>Description en</p>');
    expect(en.body.data.features).toEqual(['Feature en']);
    const vi = await get('/products/loc-product').expect(200);
    expect(vi.body.data.name).toBe('Ten tieng Viet');
    await get('/products/loc-product?locale=fr').expect(400);
    await get('/products?locale=fr').expect(400);
  });

  it('falls back to vi for a field missing in the requested locale', async () => {
    const { product } = await seedProduct(context.dataSource, { slug: 'loc-fallback' });
    await context.dataSource
      .getRepository(ProductTranslation)
      .update({ productId: product.id, locale: 'en' as never }, { tagline: null });
    const response = await get('/products/loc-fallback?locale=en').expect(200);
    expect(response.body.data.tagline).toBe('Tagline vi');
  });

  it('exposes prices, gallery urls, demo info, specifications, seo block and related products', async () => {
    const category = await seedCategory(context.dataSource, 'detail-cat', {
      vi: 'Danh muc',
      en: 'Category',
    });
    const cover = await seedMediaAsset(context.dataSource);
    const gallery = await seedMediaAsset(context.dataSource);
    const { product } = await seedProduct(context.dataSource, {
      slug: 'detail-main',
      categoryId: category.id,
      coverImageId: cover.id,
      galleryImageIds: [gallery.id],
      demoUrl: 'https://demo.example.com',
      prices: [
        usdOneTime('99.50'),
        { currency: Currency.VND, amount: '2500000', billingPeriod: BillingPeriod.ONE_TIME },
      ],
    });
    await context.dataSource
      .getRepository(Product)
      .update({ id: product.id }, { specifications: { cpu: '2 vCPU' }, demoMode: DemoMode.EMBED });
    await seedProduct(context.dataSource, { slug: 'detail-related', categoryId: category.id });
    await seedProduct(context.dataSource, { slug: 'detail-unrelated' });
    await seedProduct(context.dataSource, {
      slug: 'detail-related-draft',
      categoryId: category.id,
      status: PublicationStatus.DRAFT,
    });

    const detail = (await get('/products/detail-main?locale=en').expect(200)).body.data;
    expect(detail.prices).toEqual([
      { currency: 'USD', amount: '99.50', billingPeriod: 'one_time', isDefault: true },
      { currency: 'VND', amount: '2500000.00', billingPeriod: 'one_time', isDefault: true },
    ]);
    expect(detail.coverImageUrl).toContain('products/');
    expect(detail.galleryUrls).toHaveLength(1);
    expect(detail.demo).toEqual({ url: 'https://demo.example.com', mode: 'embed' });
    expect(detail.hasDemo).toBe(true);
    expect(detail.specifications).toEqual({ cpu: '2 vCPU' });
    expect(detail.category).toEqual({ slug: 'detail-cat', name: 'Category' });
    expect(detail.seo).toMatchObject({ title: detail.name, noIndex: false });
    expect(detail.seo.ogImageUrl).toBe(detail.coverImageUrl);
    expect(detail.related.map((card: Card) => card.slug)).toEqual(['detail-related']);
    expect(detail).not.toHaveProperty('createdById');
  });

  it('filters, sorts and paginates the list', async () => {
    const category = await seedCategory(context.dataSource, 'list-cat', {
      vi: 'Danh sach',
      en: 'Listing',
    });
    const base = { categoryId: category.id };
    await seedProduct(context.dataSource, {
      ...base,
      slug: 'ls-b',
      names: { vi: 'Bravo', en: 'Bravo' },
      prices: [usdOneTime('50.00')],
      publishedAt: new Date(Date.now() - 3 * 60_000),
    });
    await seedProduct(context.dataSource, {
      ...base,
      slug: 'ls-a',
      names: { vi: 'Alpha', en: 'Alpha' },
      prices: [usdOneTime('200.00')],
      isFeatured: true,
      publishedAt: new Date(Date.now() - 2 * 60_000),
    });
    await seedProduct(context.dataSource, {
      ...base,
      slug: 'ls-c',
      names: { vi: 'Charlie', en: 'Charlie' },
      type: ProductType.HOSTING_PLAN,
      prices: [{ currency: Currency.VND, amount: '1000', billingPeriod: BillingPeriod.MONTHLY }],
      publishedAt: new Date(Date.now() - 1 * 60_000),
    });
    const slugsOf = async (query: string) =>
      ((await get(`/products?categorySlug=list-cat&${query}`).expect(200)).body.data as Card[]).map(
        (card) => card.slug,
      );

    expect(await slugsOf('')).toEqual(['ls-c', 'ls-a', 'ls-b']);
    expect(await slugsOf('sort=name')).toEqual(['ls-a', 'ls-b', 'ls-c']);
    expect(await slugsOf('sort=price_asc')).toEqual(['ls-b', 'ls-a', 'ls-c']);
    expect(await slugsOf('sort=price_desc')).toEqual(['ls-a', 'ls-b', 'ls-c']);
    expect((await slugsOf('sort=price_asc&currency=VND'))[0]).toBe('ls-c');
    expect(await slugsOf('type=hosting_plan')).toEqual(['ls-c']);
    expect(await slugsOf('featured=true')).toEqual(['ls-a']);
    expect(await slugsOf('search=brav')).toEqual(['ls-b']);
    expect(await slugsOf('search=%25')).toEqual([]);
    expect(await slugsOf('pageSize=2&page=2')).toEqual(['ls-b']);

    const empty = await get('/products?categorySlug=missing-category').expect(200);
    expect(empty.body.data).toEqual([]);
    await get('/products?sort=random').expect(400);
    await get('/products?pageSize=101').expect(400);
    await get('/products?featured=maybe').expect(400);
    await get('/products?type=bogus').expect(400);
  });

  it('lists active categories with published product counts in the locale', async () => {
    const active = await seedCategory(context.dataSource, 'cat-active', {
      vi: 'Dang hoat dong',
      en: 'Active',
    });
    await seedCategory(
      context.dataSource,
      'cat-inactive',
      { vi: 'An', en: 'Hidden' },
      { isActive: false },
    );
    await seedProduct(context.dataSource, { categoryId: active.id });
    await seedProduct(context.dataSource, { categoryId: active.id });
    await seedProduct(context.dataSource, {
      categoryId: active.id,
      status: PublicationStatus.DRAFT,
    });

    const response = await get('/product-categories?locale=en').expect(200);
    const found = response.body.data.find((item: { slug: string }) => item.slug === 'cat-active');
    expect(found).toMatchObject({ name: 'Active', productCount: 2 });
    expect(response.body.data.some((item: { slug: string }) => item.slug === 'cat-inactive')).toBe(
      false,
    );
  });
});
