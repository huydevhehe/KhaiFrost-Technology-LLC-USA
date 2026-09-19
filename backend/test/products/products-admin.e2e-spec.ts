import { EventEmitter2 } from '@nestjs/event-emitter';
import request from 'supertest';
import { DomainEvent } from '../../src/common/constants/domain-events';
import { PublicationStatus } from '../../src/common/enums/publication-status.enum';
import { Product } from '../../src/modules/products/entities/product.entity';
import { ProductPrice } from '../../src/modules/products/entities/product-price.entity';
import { ProductsModule } from '../../src/modules/products/products.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import {
  as,
  PRODUCT_ENTITIES,
  seedCategory,
  seedMediaAsset,
  seedProduct,
  TEST_USERS,
  validCreatePayload,
} from './product-test-helpers';

describe('Products admin API', () => {
  let context: ModuleTestingContext;
  const server = () => context.app.getHttpServer();
  const { admin, staff, otherStaff, customer } = TEST_USERS;

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: PRODUCT_ENTITIES,
      imports: [ProductsModule],
    });
  });

  afterAll(async () => {
    await context.close();
  });

  async function createDraft(
    user: typeof staff | typeof admin,
    overrides: Record<string, unknown> = {},
  ) {
    const response = await request(server())
      .post('/api/v1/admin/products')
      .set(as(user))
      .send(validCreatePayload(overrides))
      .expect(201);
    return response.body.data as {
      id: string;
      slug: string;
      version: number;
      status: string;
      prices: { id: string; currency: string; amount: string; billingPeriod: string }[];
    };
  }

  const patch = (id: string, user: typeof staff | typeof admin, body: Record<string, unknown>) =>
    request(server()).patch(`/api/v1/admin/products/${id}`).set(as(user)).send(body);
  const post = (path: string, user: typeof staff | typeof admin, body: object = {}) =>
    request(server()).post(`/api/v1/admin/products/${path}`).set(as(user)).send(body);

  describe('permissions', () => {
    it('rejects anonymous users and customers on every route', async () => {
      const { product } = await seedProduct(context.dataSource);
      const id = product.id;
      const routes: [string, string][] = [
        ['get', '/api/v1/admin/products'],
        ['post', '/api/v1/admin/products'],
        ['get', `/api/v1/admin/products/${id}`],
        ['patch', `/api/v1/admin/products/${id}`],
        ['post', `/api/v1/admin/products/${id}/submit-for-review`],
        ['post', `/api/v1/admin/products/${id}/publish`],
        ['post', `/api/v1/admin/products/${id}/unpublish`],
        ['post', `/api/v1/admin/products/${id}/archive`],
        ['delete', `/api/v1/admin/products/${id}`],
        ['get', '/api/v1/admin/product-categories'],
        ['post', '/api/v1/admin/product-categories'],
      ];
      for (const [method, url] of routes) {
        await (request(server()) as any)[method](url).expect(401);
        await (request(server()) as any)[method](url).set(as(customer)).expect(403);
      }
    });

    it('lets staff read, create and edit but not publish or delete', async () => {
      await request(server()).get('/api/v1/admin/products').set(as(staff)).expect(200);
      const draft = await createDraft(staff);
      await post(`${draft.id}/publish`, staff).expect(403);
      await post(`${draft.id}/archive`, staff).expect(403);
      await request(server())
        .delete(`/api/v1/admin/products/${draft.id}`)
        .set(as(staff))
        .expect(403);
      await request(server())
        .post('/api/v1/admin/product-categories')
        .set(as(staff))
        .send({
          translations: { vi: { name: 'Danh muc' }, en: { name: 'Category' } },
        })
        .expect(403);
    });
  });

  describe('create', () => {
    it('creates a draft with a slug from the vi name and the author recorded', async () => {
      const draft = await createDraft(staff, {
        translations: {
          vi: { name: 'Mã nguồn Cửa Hàng' },
        },
        prices: [],
      });
      expect(draft.slug).toBe('ma-nguon-cua-hang');
      expect(draft.status).toBe(PublicationStatus.DRAFT);
      const row = await context.dataSource.getRepository(Product).findOneByOrFail({ id: draft.id });
      expect(row.authorId).toBe(staff.id);
      expect(row.createdById).toBe(staff.id);
    });

    it('suffixes generated slugs and rejects a taken explicit slug', async () => {
      const first = await createDraft(admin, {
        translations: { vi: { name: 'Slug Twin' } },
        prices: [],
      });
      const second = await createDraft(admin, {
        translations: { vi: { name: 'Slug Twin' } },
        prices: [],
      });
      expect(first.slug).toBe('slug-twin');
      expect(second.slug).toBe('slug-twin-2');

      const response = await request(server())
        .post('/api/v1/admin/products')
        .set(as(admin))
        .send(validCreatePayload({ slug: 'slug-twin' }))
        .expect(409);
      expect(response.body.error.code).toBe('SLUG_TAKEN');
    });

    it('rejects a duplicate sku but frees it after a soft delete', async () => {
      const first = await createDraft(admin, { sku: 'SKU-1', prices: [] });
      const conflictResponse = await request(server())
        .post('/api/v1/admin/products')
        .set(as(admin))
        .send(validCreatePayload({ sku: 'SKU-1', prices: [] }))
        .expect(409);
      expect(conflictResponse.body.error.code).toBe('SKU_TAKEN');
      await request(server())
        .delete(`/api/v1/admin/products/${first.id}`)
        .set(as(admin))
        .expect(204);
      await createDraft(admin, { sku: 'SKU-1', prices: [] });
    });

    it('validates the payload', async () => {
      const send = (body: object) =>
        request(server()).post('/api/v1/admin/products').set(as(admin)).send(body);
      await send({ type: 'source_code' }).expect(400);
      await send(validCreatePayload({ type: 'bogus' })).expect(400);
      await send(validCreatePayload({ demoUrl: 'http://insecure.example.com' })).expect(400);
      await send(validCreatePayload({ demoUrl: 'javascript:alert(1)' })).expect(400);
      await send(validCreatePayload({ specifications: { nested: { a: 1 } } })).expect(400);
      await send(validCreatePayload({ specifications: ['cpu'] })).expect(400);
      await send(validCreatePayload({ slug: 'Not A Slug' })).expect(400);
      await send(validCreatePayload({ categoryId: 'not-a-uuid' })).expect(400);
      await send(
        validCreatePayload({
          prices: [{ currency: 'EUR', amount: '1', billingPeriod: 'one_time' }],
        }),
      ).expect(400);
      await send(
        validCreatePayload({
          prices: [{ currency: 'USD', amount: '1.999', billingPeriod: 'one_time' }],
        }),
      ).expect(400);
      await send(
        validCreatePayload({
          prices: [{ currency: 'USD', amount: '0', billingPeriod: 'one_time' }],
        }),
      ).expect(400);
      await send(validCreatePayload({ unknownField: true })).expect(400);
      const unknownCategory = await send(
        validCreatePayload({ categoryId: '00000000-0000-4000-8000-00000000dead' }),
      ).expect(400);
      expect(unknownCategory.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('stores a flat specifications map, https demo url, tech stack, sanitized html and media', async () => {
      const cover = await seedMediaAsset(context.dataSource);
      const galleryOne = await seedMediaAsset(context.dataSource);
      const galleryTwo = await seedMediaAsset(context.dataSource);
      const category = await seedCategory(context.dataSource, 'cloud', {
        vi: 'Đám mây',
        en: 'Cloud',
      });
      const draft = await createDraft(admin, {
        type: 'hosting_plan',
        categoryId: category.id,
        coverImageId: cover.id,
        galleryImageIds: [galleryTwo.id, galleryOne.id],
        demoUrl: 'https://demo.example.com/app',
        demoMode: 'embed',
        techStack: ['NestJS', 'PostgreSQL'],
        specifications: { cpu: '2 vCPU', ram: '4 GB', bandwidth: 1000 },
        prices: [{ currency: 'USD', amount: '10', billingPeriod: 'monthly' }],
        translations: {
          vi: {
            name: 'Goi VPS',
            tagline: 'Nhanh',
            descriptionHtml: '<p>ok</p><script>alert(1)</script>',
            features: ['  SSD  ', '', 'NVMe'],
          },
        },
      });
      const detail = (
        await request(server()).get(`/api/v1/admin/products/${draft.id}`).set(as(admin)).expect(200)
      ).body.data;
      expect(detail.specifications).toEqual({ cpu: '2 vCPU', ram: '4 GB', bandwidth: 1000 });
      expect(detail.demoMode).toBe('embed');
      expect(detail.techStack).toEqual(['NestJS', 'PostgreSQL']);
      expect(detail.translations.vi.descriptionHtml).toBe('<p>ok</p>');
      expect(detail.translations.vi.features).toEqual(['SSD', 'NVMe']);
      expect(detail.gallery.map((item: { mediaAssetId: string }) => item.mediaAssetId)).toEqual([
        galleryTwo.id,
        galleryOne.id,
      ]);
      expect(detail.coverImageUrl).toContain(encodeURIComponent(cover.storageKey.split('/')[1]));
      expect(detail.prices[0]).toMatchObject({ amount: '10.00', isDefault: true });
    });

    it('rejects unknown media ids', async () => {
      const response = await request(server())
        .post('/api/v1/admin/products')
        .set(as(admin))
        .send(validCreatePayload({ coverImageId: '00000000-0000-4000-8000-00000000beef' }))
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('update', () => {
    it('lets a staff member edit only their own drafts', async () => {
      const draft = await createDraft(staff, { prices: [] });
      await patch(draft.id, otherStaff, { version: draft.version, isFeatured: true }).expect(403);
      const updated = await patch(draft.id, staff, {
        version: draft.version,
        isFeatured: true,
        sortOrder: 5,
      }).expect(200);
      expect(updated.body.data.isFeatured).toBe(true);
      expect(updated.body.data.sortOrder).toBe(5);
      expect(updated.body.data.version).toBeGreaterThan(draft.version);
    });

    it('rejects a stale version with VERSION_CONFLICT', async () => {
      const draft = await createDraft(admin, { prices: [] });
      await patch(draft.id, admin, { version: draft.version, sortOrder: 1 }).expect(200);
      const stale = await patch(draft.id, admin, { version: draft.version, sortOrder: 2 }).expect(
        409,
      );
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');
      await patch(draft.id, admin, { sortOrder: 2 }).expect(400);
    });

    it('bumps the version when only translations change', async () => {
      const draft = await createDraft(admin, { prices: [] });
      const updated = await patch(draft.id, admin, {
        version: draft.version,
        translations: { en: { name: 'English name' } },
      }).expect(200);
      expect(updated.body.data.translations.en.name).toBe('English name');
      expect(updated.body.data.version).toBeGreaterThan(draft.version);
    });

    it('requires a name when adding a new locale row and refuses null on required fields', async () => {
      const draft = await createDraft(admin, {
        prices: [],
        translations: { vi: { name: 'Only Vi' } },
      });
      const missingName = await patch(draft.id, admin, {
        version: draft.version,
        translations: { en: { tagline: 'x' } },
      }).expect(400);
      expect(missingName.body.error.code).toBe('VALIDATION_FAILED');
      await patch(draft.id, admin, { version: draft.version, type: null }).expect(400);
    });

    it('replaces prices in place, keeping row ids and rejecting invalid sets', async () => {
      const draft = await createDraft(admin, {
        type: 'hosting_plan',
        prices: [
          { currency: 'USD', amount: '10', billingPeriod: 'monthly' },
          { currency: 'USD', amount: '100', billingPeriod: 'yearly' },
        ],
      });
      const monthly = draft.prices.find((price) => price.billingPeriod === 'monthly')!;

      const updated = await patch(draft.id, admin, {
        version: draft.version,
        prices: [
          { currency: 'USD', amount: '12.50', billingPeriod: 'monthly', isDefault: true },
          { currency: 'VND', amount: '250000', billingPeriod: 'monthly' },
        ],
      }).expect(200);
      const prices = updated.body.data.prices as {
        id: string;
        currency: string;
        amount: string;
        billingPeriod: string;
        isDefault: boolean;
      }[];
      expect(prices).toHaveLength(2);
      const usdMonthly = prices.find((price) => price.currency === 'USD')!;
      expect(usdMonthly).toMatchObject({ id: monthly.id, amount: '12.50', isDefault: true });
      expect(prices.find((price) => price.currency === 'VND')).toMatchObject({
        amount: '250000.00',
        isDefault: true,
      });

      const version = updated.body.data.version;
      await patch(draft.id, admin, {
        version,
        prices: [
          { currency: 'USD', amount: '1', billingPeriod: 'monthly' },
          { currency: 'USD', amount: '2', billingPeriod: 'monthly' },
        ],
      }).expect(400);
      await patch(draft.id, admin, {
        version,
        prices: [{ currency: 'VND', amount: '100.50', billingPeriod: 'monthly' }],
      }).expect(400);
      await patch(draft.id, admin, {
        version,
        prices: [
          { currency: 'USD', amount: '1', billingPeriod: 'monthly', isDefault: true },
          { currency: 'USD', amount: '2', billingPeriod: 'yearly', isDefault: true },
        ],
      }).expect(400);

      const stored = await context.dataSource
        .getRepository(ProductPrice)
        .find({ where: { productId: draft.id } });
      expect(stored).toHaveLength(2);
    });

    it('refuses prices on a price-on-request product and the reverse', async () => {
      const draft = await createDraft(admin, { priceOnRequest: true, prices: [] });
      await patch(draft.id, admin, {
        version: draft.version,
        prices: [{ currency: 'USD', amount: '5', billingPeriod: 'one_time' }],
      }).expect(400);
      await request(server())
        .post('/api/v1/admin/products')
        .set(as(admin))
        .send(validCreatePayload({ priceOnRequest: true }))
        .expect(400);

      const priced = await createDraft(admin);
      await patch(priced.id, admin, { version: priced.version, priceOnRequest: true }).expect(400);
    });

    it('returns 404 for an unknown or malformed id', async () => {
      await patch('00000000-0000-4000-8000-00000000f00d', admin, { version: 1 }).expect(404);
      await request(server()).get('/api/v1/admin/products/nope').set(as(admin)).expect(400);
    });
  });

  describe('workflow', () => {
    it('runs draft -> in_review -> published -> draft -> archived and emits the review event', async () => {
      const events: unknown[] = [];
      const emitter = context.moduleRef.get(EventEmitter2);
      const listener = (payload: unknown) => events.push(payload);
      emitter.on(DomainEvent.PRODUCT_SUBMITTED_FOR_REVIEW, listener);

      const draft = await createDraft(staff, {
        translations: {
          vi: { name: 'Workflow Vi', tagline: 't', descriptionHtml: '<p>d</p>' },
          en: { name: 'Workflow En', tagline: 't', descriptionHtml: '<p>d</p>' },
        },
      });

      const submitted = await post(`${draft.id}/submit-for-review`, staff).expect(200);
      expect(submitted.body.data.status).toBe(PublicationStatus.IN_REVIEW);
      expect(events).toEqual([{ productId: draft.id, name: 'Workflow Vi', authorId: staff.id }]);
      emitter.off(DomainEvent.PRODUCT_SUBMITTED_FOR_REVIEW, listener);

      await post(`${draft.id}/submit-for-review`, staff).expect(409);
      await patch(draft.id, staff, { version: submitted.body.data.version, sortOrder: 9 }).expect(
        403,
      );

      const published = await post(`${draft.id}/publish`, admin).expect(200);
      expect(published.body.data.status).toBe(PublicationStatus.PUBLISHED);
      expect(published.body.data.publishedAt).not.toBeNull();
      await post(`${draft.id}/publish`, admin).expect(409);

      await request(server()).get(`/api/v1/public/products/${draft.slug}`).expect(200);

      const unpublished = await post(`${draft.id}/unpublish`, admin).expect(200);
      expect(unpublished.body.data.status).toBe(PublicationStatus.DRAFT);
      await request(server()).get(`/api/v1/public/products/${draft.slug}`).expect(404);

      const archived = await post(`${draft.id}/archive`, admin).expect(200);
      expect(archived.body.data.status).toBe(PublicationStatus.ARCHIVED);
      await post(`${draft.id}/submit-for-review`, admin).expect(409);
      await post(`${draft.id}/publish`, admin).expect(200);
    });

    it("does not let another staff member submit somebody else's draft", async () => {
      const draft = await createDraft(staff);
      await post(`${draft.id}/submit-for-review`, otherStaff).expect(403);
    });

    it('rejects stale versions on transitions when a version is sent', async () => {
      const draft = await createDraft(admin, { prices: [], priceOnRequest: true });
      await patch(draft.id, admin, { version: draft.version, sortOrder: 3 }).expect(200);
      const stale = await post(`${draft.id}/submit-for-review`, admin, {
        version: draft.version,
      }).expect(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    });

    it('requires vi and en content to publish (TRANSLATION_MISSING)', async () => {
      const draft = await createDraft(admin, {
        translations: { vi: { name: 'Vi Only', tagline: 't', descriptionHtml: '<p>d</p>' } },
      });
      const response = await post(`${draft.id}/publish`, admin).expect(422);
      expect(response.body.error.code).toBe('TRANSLATION_MISSING');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          { locale: 'en', field: 'name' },
          { locale: 'en', field: 'tagline' },
          { locale: 'en', field: 'descriptionHtml' },
        ]),
      );

      const blankTagline = await createDraft(admin, {
        translations: {
          vi: { name: 'Blank Tagline', descriptionHtml: '<p>d</p>' },
          en: { name: 'Blank Tagline', tagline: 't', descriptionHtml: '<p>d</p>' },
        },
      });
      const blank = await post(`${blankTagline.id}/publish`, admin).expect(422);
      expect(blank.body.error.details).toEqual([{ locale: 'vi', field: 'tagline' }]);
    });

    it('requires a price unless the product is price on request', async () => {
      const noPrice = await createDraft(admin, { prices: [] });
      const response = await post(`${noPrice.id}/publish`, admin).expect(422);
      expect(response.body.error.code).toBe('PRODUCT_PRICE_REQUIRED');

      const onRequest = await createDraft(admin, { prices: [], priceOnRequest: true });
      await post(`${onRequest.id}/publish`, admin).expect(200);
    });

    it('requires recurring prices for hosting plans and a demo url for live demos', async () => {
      const hosting = await createDraft(admin, {
        type: 'hosting_plan',
        prices: [{ currency: 'USD', amount: '10', billingPeriod: 'one_time' }],
      });
      const hostingResponse = await post(`${hosting.id}/publish`, admin).expect(422);
      expect(hostingResponse.body.error.code).toBe('HOSTING_BILLING_PERIOD_REQUIRED');
      await patch(hosting.id, admin, {
        version: hosting.version,
        prices: [{ currency: 'USD', amount: '10', billingPeriod: 'yearly' }],
      }).expect(200);
      await post(`${hosting.id}/publish`, admin).expect(200);

      const demo = await createDraft(admin, { type: 'live_demo' });
      const demoResponse = await post(`${demo.id}/publish`, admin).expect(422);
      expect(demoResponse.body.error.code).toBe('DEMO_URL_REQUIRED');
      await patch(demo.id, admin, {
        version: demo.version,
        demoUrl: 'https://demo.example.com',
      }).expect(200);
      await post(`${demo.id}/publish`, admin).expect(200);
    });

    it('keeps published products valid on edit and needs update-any permission', async () => {
      const draft = await createDraft(staff);
      const published = (await post(`${draft.id}/publish`, admin).expect(200)).body.data;

      await patch(draft.id, staff, { version: published.version, sortOrder: 4 }).expect(403);

      const broken = await patch(draft.id, admin, {
        version: published.version,
        prices: [],
      }).expect(422);
      expect(broken.body.error.code).toBe('PRODUCT_PRICE_REQUIRED');
      const stored = await context.dataSource
        .getRepository(ProductPrice)
        .count({ where: { productId: draft.id } });
      expect(stored).toBe(1);

      await patch(draft.id, admin, { version: published.version, sortOrder: 4 }).expect(200);
    });

    it('accepts a scheduled publication date and hides the product until then', async () => {
      const draft = await createDraft(admin);
      const future = new Date(Date.now() + 24 * 3_600_000).toISOString();
      await post(`${draft.id}/publish`, admin, { publishedAt: future }).expect(200);
      await request(server()).get(`/api/v1/public/products/${draft.slug}`).expect(404);
    });
  });

  describe('soft delete', () => {
    it('hides a deleted product and frees its slug', async () => {
      const draft = await createDraft(admin, { slug: 'to-delete', prices: [] });
      await request(server())
        .delete(`/api/v1/admin/products/${draft.id}`)
        .set(as(admin))
        .expect(204);
      await request(server()).get(`/api/v1/admin/products/${draft.id}`).set(as(admin)).expect(404);
      await request(server())
        .delete(`/api/v1/admin/products/${draft.id}`)
        .set(as(admin))
        .expect(404);
      const row = await context.dataSource
        .getRepository(Product)
        .findOne({ where: { id: draft.id }, withDeleted: true });
      expect(row?.deletedAt).not.toBeNull();
      const again = await createDraft(admin, { slug: 'to-delete', prices: [] });
      expect(again.slug).toBe('to-delete');
    });
  });

  describe('list', () => {
    it('filters by status, type, category, featured, search and missing locale', async () => {
      const category = await seedCategory(context.dataSource, 'list-cat', {
        vi: 'Danh sach',
        en: 'Listing',
      });
      const marker = `zq${Date.now()}`;
      await seedProduct(context.dataSource, {
        slug: `${marker}-published`,
        names: { vi: `${marker} da xuat ban`, en: `${marker} live` },
        categoryId: category.id,
        isFeatured: true,
      });
      await seedProduct(context.dataSource, {
        slug: `${marker}-draft`,
        status: PublicationStatus.DRAFT,
        type: 'hosting_plan' as never,
        names: { vi: `${marker} nhap`, en: `${marker} draft` },
      });
      const partial = await createDraft(admin, {
        slug: `${marker}-partial`,
        prices: [],
        translations: { vi: { name: `${marker} partial` } },
      });

      const list = async (query: string) =>
        (
          await request(server())
            .get(`/api/v1/admin/products?search=${marker}&${query}`)
            .set(as(staff))
            .expect(200)
        ).body as {
          data: {
            id: string;
            slug: string;
            missingLocales: string[];
            names: Record<string, string>;
          }[];
          meta: { total: number; page: number; pageSize: number; totalPages: number };
        };

      expect((await list('')).meta.total).toBe(3);
      expect((await list('status=draft')).data.map((item) => item.slug).sort()).toEqual([
        `${marker}-draft`,
        `${marker}-partial`,
      ]);
      expect((await list('status=published')).data).toHaveLength(1);
      expect((await list('type=hosting_plan')).data.map((item) => item.slug)).toEqual([
        `${marker}-draft`,
      ]);
      expect((await list(`categoryId=${category.id}`)).data.map((item) => item.slug)).toEqual([
        `${marker}-published`,
      ]);
      expect((await list('featured=true')).data).toHaveLength(1);
      expect((await list('featured=false')).data).toHaveLength(2);
      expect((await list('missingLocale=en')).data.map((item) => item.id)).toEqual([partial.id]);
      expect((await list('missingLocale=vi')).data.map((item) => item.slug)).toEqual([
        `${marker}-partial`,
      ]);

      const page = await list('pageSize=2&page=2&sortBy=slug&sortOrder=asc');
      expect(page.meta).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
      expect(page.data).toHaveLength(1);
    });

    it('treats search wildcards literally and rejects bad filters', async () => {
      const response = await request(server())
        .get('/api/v1/admin/products?search=%25')
        .set(as(admin))
        .expect(200);
      expect(response.body.meta.total).toBe(0);
      await request(server()).get('/api/v1/admin/products?status=nope').set(as(admin)).expect(400);
      await request(server())
        .get('/api/v1/admin/products?pageSize=1000')
        .set(as(admin))
        .expect(400);
      await request(server())
        .get('/api/v1/admin/products?sortBy=deletedAt;drop')
        .set(as(admin))
        .expect(400);
      await request(server())
        .get('/api/v1/admin/products?sortBy=password')
        .set(as(admin))
        .expect(200);
    });
  });

  describe('categories', () => {
    it('supports create, update with version checks, slug uniqueness and guarded delete', async () => {
      const created = await request(server())
        .post('/api/v1/admin/product-categories')
        .set(as(admin))
        .send({
          translations: { vi: { name: 'Mã nguồn' }, en: { name: 'Source code' } },
          sortOrder: 2,
        })
        .expect(201);
      const category = created.body.data;
      expect(category.slug).toBe('ma-nguon');
      expect(category.translations.en.name).toBe('Source code');

      const duplicate = await request(server())
        .post('/api/v1/admin/product-categories')
        .set(as(admin))
        .send({
          slug: 'ma-nguon',
          translations: { vi: { name: 'a' }, en: { name: 'b' } },
        })
        .expect(409);
      expect(duplicate.body.error.code).toBe('SLUG_TAKEN');

      await request(server())
        .post('/api/v1/admin/product-categories')
        .set(as(admin))
        .send({ translations: { vi: { name: 'chi vi' } } })
        .expect(400);

      const updated = await request(server())
        .patch(`/api/v1/admin/product-categories/${category.id}`)
        .set(as(admin))
        .send({
          version: category.version,
          isActive: false,
          translations: { en: { name: 'Code' } },
        })
        .expect(200);
      expect(updated.body.data.isActive).toBe(false);
      expect(updated.body.data.translations.en.name).toBe('Code');
      const stale = await request(server())
        .patch(`/api/v1/admin/product-categories/${category.id}`)
        .set(as(admin))
        .send({ version: category.version, sortOrder: 9 })
        .expect(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');

      const draft = await createDraft(admin, { categoryId: category.id, prices: [] });
      const inUse = await request(server())
        .delete(`/api/v1/admin/product-categories/${category.id}`)
        .set(as(admin))
        .expect(409);
      expect(inUse.body.error.code).toBe('CATEGORY_IN_USE');

      await request(server())
        .delete(`/api/v1/admin/products/${draft.id}`)
        .set(as(admin))
        .expect(204);
      await request(server())
        .delete(`/api/v1/admin/product-categories/${category.id}`)
        .set(as(admin))
        .expect(204);
      await request(server())
        .get(`/api/v1/admin/product-categories/${category.id}`)
        .set(as(staff))
        .expect(404);
    });
  });
});
