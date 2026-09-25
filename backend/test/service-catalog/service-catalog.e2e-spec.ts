import request from 'supertest';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import {
  SERVICE_CATALOG_ENTITIES,
  ServiceCatalogModule,
} from '../../src/modules/service-catalog/service-catalog.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import {
  asAdmin,
  asCustomer,
  asStaff,
  bilingual,
  completeCategoryPayload,
  createMediaAsset,
} from './service-catalog.fixtures';

describe('service catalog (e2e)', () => {
  let context: ModuleTestingContext;
  let mediaId: string;

  const server = () => context.app.getHttpServer();
  const createCategory = async (payload: Record<string, unknown>) =>
    request(server()).post('/api/v1/admin/services').set(asAdmin()).send(payload);
  const createComplete = async (title?: string) => {
    const response = await createCategory(completeCategoryPayload(mediaId, title));
    expect(response.status).toBe(201);
    return response.body.data as Record<string, any>;
  };

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, User, ...SERVICE_CATALOG_ENTITIES],
      imports: [ServiceCatalogModule],
    });
    mediaId = (await createMediaAsset(context.dataSource)).id;
  });

  afterAll(async () => {
    await context.close();
  });

  describe('permissions', () => {
    it('rejects anonymous and customers, lets staff read only, lets admins write', async () => {
      await request(server()).get('/api/v1/admin/services').expect(401);
      await request(server()).get('/api/v1/admin/services').set(asCustomer()).expect(403);
      await request(server()).get('/api/v1/admin/services').set(asStaff()).expect(200);
      await request(server()).get('/api/v1/admin/services/overview').set(asStaff()).expect(200);

      const created = await createComplete('Quyền truy cập');
      const id = created.id as string;
      const staff = asStaff();
      await request(server()).post('/api/v1/admin/services').set(staff).send({}).expect(403);
      await request(server())
        .patch(`/api/v1/admin/services/${id}`)
        .set(staff)
        .send({ version: 1 })
        .expect(403);
      await request(server()).post(`/api/v1/admin/services/${id}/publish`).set(staff).expect(403);
      await request(server()).post(`/api/v1/admin/services/${id}/archive`).set(staff).expect(403);
      await request(server())
        .put('/api/v1/admin/services/reorder')
        .set(staff)
        .send({ ids: [id] })
        .expect(403);
      await request(server())
        .put('/api/v1/admin/services/overview')
        .set(staff)
        .send({})
        .expect(403);
      await request(server()).delete(`/api/v1/admin/services/${id}`).set(staff).expect(403);
      await request(server()).get(`/api/v1/admin/services/${id}`).set(staff).expect(200);
    });
  });

  describe('creating', () => {
    it('validates the payload', async () => {
      const missingIcon = await createCategory({ translations: { vi: { title: 'x' } } });
      expect(missingIcon.status).toBe(400);
      expect(missingIcon.body.error.code).toBe('VALIDATION_FAILED');

      await createCategory({ iconKey: 'unknown', translations: { vi: { title: 'x' } } }).then(
        (response) => expect(response.status).toBe(400),
      );
      await createCategory({
        iconKey: 'ai',
        unexpected: true,
        translations: { vi: { title: 'x' } },
      }).then((response) => expect(response.status).toBe(400));
      await createCategory({ iconKey: 'ai', translations: { en: { title: 'English only' } } }).then(
        (response) => expect(response.status).toBe(400),
      );
      await createCategory({
        iconKey: 'ai',
        translations: { vi: { title: 'Bad href' } },
        partnerBanner: { ctaHref: 'javascript:alert(1)', translations: {} },
      }).then((response) => expect(response.status).toBe(400));
      await createCategory({
        iconKey: 'ai',
        translations: { vi: { title: 'Bad video link' } },
        products: [{ videoUrl: 'not-a-url', linkType: 'none', translations: {} }],
      }).then((response) => expect(response.status).toBe(400));
      await createCategory({
        iconKey: 'ai',
        translations: { vi: { title: 'x'.repeat(201) } },
      }).then((response) => expect(response.status).toBe(400));
    });

    it('stores the whole aggregate with media references and ordered blocks', async () => {
      const created = await createComplete('AI & Tự động hoá');
      expect(created.slug).toBe('ai-tu-dong-hoa');
      expect(created.status).toBe('draft');
      expect(created.version).toBeGreaterThanOrEqual(1);
      expect(created.createdById).toBeTruthy();
      expect(created.coverImageUrl).toContain('image-');
      expect(created.translations.vi.title).toBe('AI & Tự động hoá');
      expect(created.translations.en.categoryName).toBe('AI & Automation');
      expect(created.stats[0]).toMatchObject({ iconKey: 'rocket', value: '50+' });
      expect(created.products.map((item: any) => item.linkType)).toEqual(['external', 'none']);
      expect(created.products[0].linkExternalUrl).toBe('/dich-vu/ai-automation');
      expect(created.products[0]).toMatchObject({ tags: ['NLP', 'Voice AI'], imageId: mediaId });
      expect(created.products[0].imageUrl).toContain('image-');
      expect(created.products[1].imageUrl).toBeNull();
      expect(created.processSteps).toHaveLength(2);
      expect(created.testimonials[0].translations.en.authorRole).toBe('Clinic owner');
      expect(created.partnerBanner.ctaHref).toBe('/lien-he');

      const second = await createComplete('AI & Tự động hoá');
      expect(second.slug).toBe('ai-tu-dong-hoa-2');
    });

    it('rejects duplicate explicit slugs and reserved slugs', async () => {
      const base = { iconKey: 'code', translations: { vi: { title: 'Trùng slug' } } };
      const first = await createCategory({ ...base, slug: 'unique-slug' });
      expect(first.status).toBe(201);
      const duplicate = await createCategory({ ...base, slug: 'unique-slug' });
      expect(duplicate.status).toBe(409);
      const reserved = await createCategory({ ...base, slug: 'overview' });
      expect(reserved.status).toBe(400);
    });

    it('rejects unknown media assets', async () => {
      const response = await createCategory({
        iconKey: 'ai',
        coverImageId: '00000000-0000-4000-8000-00000000ffff',
        translations: { vi: { title: 'Ảnh không tồn tại' } },
      });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('protects media that is still referenced', async () => {
      await createComplete('Ảnh đang dùng');
      await expect(
        context.dataSource.getRepository(MediaAsset).delete({ id: mediaId }),
      ).rejects.toThrow();
    });
  });

  describe('publishing workflow', () => {
    it('needs both locales for every required field, including repeated blocks', async () => {
      const payload = completeCategoryPayload(mediaId, 'Thiếu tiếng Anh');
      payload.translations.en = { title: 'Missing English' } as any;
      payload.products[0].translations.en = { name: 'Only a name' } as any;
      const created = await createCategory(payload);
      expect(created.status).toBe(201);

      const publish = await request(server())
        .post(`/api/v1/admin/services/${created.body.data.id}/publish`)
        .set(asAdmin());
      expect(publish.status).toBe(422);
      expect(publish.body.error.code).toBe('TRANSLATION_MISSING');
      const missing = publish.body.error.details as { locale: string; field: string }[];
      expect(missing).toEqual(
        expect.arrayContaining([
          { locale: 'en', field: 'summary' },
          { locale: 'en', field: 'heroTitle' },
          { locale: 'en', field: 'products[0].description' },
        ]),
      );
      expect(missing.every((item) => item.locale === 'en')).toBe(true);
    });

    it('publishes, hides again on unpublish and enforces the transition table', async () => {
      const created = await createComplete('Quy trình xuất bản');
      const base = `/api/v1/admin/services/${created.id}`;

      const published = await request(server()).post(`${base}/publish`).set(asAdmin()).expect(200);
      expect(published.body.data.status).toBe('published');
      expect(published.body.data.publishedAt).toBeTruthy();

      await request(server()).post(`${base}/publish`).set(asAdmin()).expect(409);
      await request(server()).post(`${base}/unpublish`).set(asAdmin()).expect(200);
      await request(server()).post(`${base}/archive`).set(asAdmin()).expect(200);
      const invalid = await request(server()).post(`${base}/publish`).set(asAdmin());
      expect(invalid.status).toBe(409);
      expect(invalid.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      await request(server()).post(`${base}/unpublish`).set(asAdmin()).expect(200);
    });

    it('does not allow a published service to become incomplete', async () => {
      const created = await createComplete('Đã xuất bản');
      const base = `/api/v1/admin/services/${created.id}`;
      await request(server()).post(`${base}/publish`).set(asAdmin()).expect(200);
      const response = await request(server())
        .patch(base)
        .set(asAdmin())
        .send({
          version: await currentVersion(created.id),
          faq: [{ translations: { vi: { question: 'Chỉ tiếng Việt', answer: 'Có' } } }],
        });
      expect(response.status).toBe(422);
      const unchanged = await request(server()).get(base).set(asAdmin()).expect(200);
      expect(unchanged.body.data.faq).toHaveLength(1);
      expect(unchanged.body.data.faq[0].translations.en.question).toBe('How long does it take?');
    });
  });

  async function currentVersion(id: string): Promise<number> {
    const response = await request(server()).get(`/api/v1/admin/services/${id}`).set(asAdmin());
    return response.body.data.version as number;
  }

  describe('updating', () => {
    it('applies optimistic locking and bumps the version', async () => {
      const created = await createComplete('Khoá phiên bản');
      const base = `/api/v1/admin/services/${created.id}`;

      const updated = await request(server())
        .patch(base)
        .set(asAdmin())
        .send({ version: created.version, sortOrder: 7 })
        .expect(200);
      expect(updated.body.data.sortOrder).toBe(7);
      expect(updated.body.data.version).toBeGreaterThan(created.version);

      const stale = await request(server())
        .patch(base)
        .set(asAdmin())
        .send({ version: created.version, sortOrder: 8 });
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    });

    it('merges translations per field and replaces only the blocks that are sent', async () => {
      const created = await createComplete('Cập nhật từng phần');
      const base = `/api/v1/admin/services/${created.id}`;
      const updated = await request(server())
        .patch(base)
        .set(asAdmin())
        .send({
          version: created.version,
          translations: { en: { summary: 'New English summary', seoTitle: null } },
          products: [
            {
              tags: [],
              linkType: 'none',
              translations: bilingual(
                { name: 'Sản phẩm mới', description: 'Mô tả' },
                { name: 'New product', description: 'Text' },
              ),
            },
          ],
          partnerBanner: null,
        })
        .expect(200);
      const data = updated.body.data;
      expect(data.translations.en.summary).toBe('New English summary');
      expect(data.translations.en.title).toBe('AI & Automation');
      expect(data.translations.en.seoTitle).toBeNull();
      expect(data.products).toHaveLength(1);
      expect(data.products[0].translations.vi.name).toBe('Sản phẩm mới');
      expect(data.partnerBanner).toBeNull();
      expect(data.stats).toHaveLength(1);
      expect(data.faq).toHaveLength(1);
    });

    it('does not let a slug collide with another service', async () => {
      const first = await createComplete('Slug đầu tiên');
      const second = await createComplete('Slug thứ hai');
      const response = await request(server())
        .patch(`/api/v1/admin/services/${second.id}`)
        .set(asAdmin())
        .send({ version: second.version, slug: first.slug });
      expect(response.status).toBe(409);
    });
  });

  describe('listing, ordering and deleting', () => {
    it('filters, searches and paginates the admin list', async () => {
      await createComplete('Danh sách tìm kiếm độc nhất');
      const search = await request(server())
        .get('/api/v1/admin/services')
        .query({ search: 'tìm kiếm độc nhất' })
        .set(asStaff())
        .expect(200);
      expect(search.body.data).toHaveLength(1);
      expect(search.body.data[0].titles.vi).toBe('Danh sách tìm kiếm độc nhất');
      expect(search.body.meta).toMatchObject({ page: 1, total: 1 });

      const percent = await request(server())
        .get('/api/v1/admin/services')
        .query({ search: '%' })
        .set(asStaff());
      expect(percent.body.data).toHaveLength(0);

      const drafts = await request(server())
        .get('/api/v1/admin/services')
        .query({ status: 'draft', pageSize: 2, page: 1 })
        .set(asStaff())
        .expect(200);
      expect(drafts.body.data.length).toBeLessThanOrEqual(2);
      expect(drafts.body.meta.pageSize).toBe(2);
      await request(server())
        .get('/api/v1/admin/services')
        .query({ status: 'nope' })
        .set(asStaff())
        .expect(400);
    });

    it('reorders services and rejects unknown ids', async () => {
      const a = await createComplete('Sắp xếp A');
      const b = await createComplete('Sắp xếp B');
      const c = await createComplete('Sắp xếp C');
      const reorder = await request(server())
        .put('/api/v1/admin/services/reorder')
        .set(asAdmin())
        .send({ ids: [c.id, a.id, b.id] })
        .expect(200);
      expect(reorder.body.data.slice(0, 3)).toEqual([c.id, a.id, b.id]);

      const list = await request(server())
        .get('/api/v1/admin/services')
        .query({ pageSize: 100 })
        .set(asAdmin())
        .expect(200);
      const orderedIds = list.body.data.map((item: any) => item.id);
      expect(orderedIds.slice(0, 3)).toEqual([c.id, a.id, b.id]);

      await request(server())
        .put('/api/v1/admin/services/reorder')
        .set(asAdmin())
        .send({ ids: ['00000000-0000-4000-8000-00000000ffff'] })
        .expect(400);
      await request(server())
        .put('/api/v1/admin/services/reorder')
        .set(asAdmin())
        .send({ ids: [] })
        .expect(400);
    });

    it('soft deletes and frees the slug', async () => {
      const created = await createComplete('Sẽ bị xoá');
      await request(server())
        .delete(`/api/v1/admin/services/${created.id}`)
        .set(asAdmin())
        .expect(204);
      await request(server())
        .get(`/api/v1/admin/services/${created.id}`)
        .set(asAdmin())
        .expect(404);
      await request(server())
        .delete(`/api/v1/admin/services/${created.id}`)
        .set(asAdmin())
        .expect(404);
      const row = await context.dataSource.query(
        'SELECT deleted_at FROM service_categories WHERE id = $1',
        [created.id],
      );
      expect(row[0].deleted_at).not.toBeNull();
      const reused = await createCategory({
        ...completeCategoryPayload(mediaId, 'Sẽ bị xoá'),
        slug: created.slug,
      });
      expect(reused.status).toBe(201);
    });
  });

  describe('public API', () => {
    it('serves only published services in the requested locale', async () => {
      const draft = await createComplete('Bản nháp công khai');
      const live = await createComplete('Dịch vụ công khai');
      await request(server())
        .post(`/api/v1/admin/services/${live.id}/publish`)
        .set(asAdmin())
        .expect(200);

      await request(server()).get(`/api/v1/public/services/${draft.slug}`).expect(404);

      const list = await request(server()).get('/api/v1/public/services').expect(200);
      const slugs = list.body.data.map((card: any) => card.slug);
      expect(slugs).toContain(live.slug);
      expect(slugs).not.toContain(draft.slug);
      expect(list.body.meta.total).toBe(slugs.length);

      const vi = await request(server()).get(`/api/v1/public/services/${live.slug}`).expect(200);
      expect(vi.body.data.title).toBe('Dịch vụ công khai');
      expect(vi.body.data.heroTitle).toBe('Tự động hoá doanh nghiệp bằng AI');
      expect(vi.body.data.stats[0]).toMatchObject({ value: '50+', label: 'Dự án AI' });
      expect(vi.body.data.processSteps.map((step: any) => step.step)).toEqual(['01', '02']);
      expect(vi.body.data.products[0]).toMatchObject({
        name: 'AI Lễ tân',
        href: '/dich-vu/ai-automation',
      });
      expect(vi.body.data.partnerBanner.ctaHref).toBe('/lien-he');
      expect(vi.body.data.seo.title).toBe('AI & Tự động hoá');
      expect(vi.body.data.heroImageUrl).toContain('image-');

      const en = await request(server())
        .get(`/api/v1/public/services/${live.slug}`)
        .query({ locale: 'en' })
        .expect(200);
      expect(en.body.data.title).toBe('AI & Automation');
      expect(en.body.data.faq[0].question).toBe('How long does it take?');
      expect(en.body.data.processSteps[0].title).toBe('Needs Assessment');

      await request(server())
        .get(`/api/v1/public/services/${live.slug}`)
        .query({ locale: 'fr' })
        .expect(400);

      const slugList = await request(server()).get('/api/v1/public/services/slugs').expect(200);
      expect(slugList.body.data.map((row: any) => row.slug)).toContain(live.slug);
    });

    it('hides a service again after unpublishing or deleting it', async () => {
      const live = await createComplete('Ẩn lại sau khi xuất bản');
      const base = `/api/v1/admin/services/${live.id}`;
      await request(server()).post(`${base}/publish`).set(asAdmin()).expect(200);
      await request(server()).get(`/api/v1/public/services/${live.slug}`).expect(200);
      await request(server()).post(`${base}/unpublish`).set(asAdmin()).expect(200);
      await request(server()).get(`/api/v1/public/services/${live.slug}`).expect(404);
      await request(server()).post(`${base}/publish`).set(asAdmin()).expect(200);
      await request(server()).delete(base).set(asAdmin()).expect(204);
      await request(server()).get(`/api/v1/public/services/${live.slug}`).expect(404);
    });
  });

  describe('services overview', () => {
    const overviewPayload = {
      stats: [
        {
          iconKey: 'rocket',
          value: '50+',
          translations: bilingual(
            { label: 'Dự án đã triển khai', description: 'Từ startup đến doanh nghiệp lớn' },
            { label: 'Projects Delivered', description: 'From startups to enterprises' },
          ),
        },
        {
          iconKey: 'clock',
          value: '5+',
          translations: bilingual(
            { label: 'Năm kinh nghiệm', description: 'Trong lĩnh vực công nghệ' },
            { label: 'Years of Experience', description: 'In technology' },
          ),
        },
      ],
      processSteps: [
        {
          iconKey: 'search',
          translations: bilingual(
            { title: 'Tìm hiểu nhu cầu', description: 'Phân tích mục tiêu.' },
            { title: 'Understand Your Needs', description: 'Analyze your goals.' },
          ),
        },
      ],
      highlights: [
        {
          iconKey: 'bolt',
          translations: bilingual(
            { title: 'Công nghệ tiên tiến', description: 'AI mới nhất.' },
            { title: 'Cutting-Edge Technology', description: 'The latest AI.' },
          ),
        },
      ],
    };

    it('requires both locales and stores the blocks in order', async () => {
      const incomplete = await request(server())
        .put('/api/v1/admin/services/overview')
        .set(asAdmin())
        .send({
          stats: [
            {
              iconKey: 'rocket',
              value: '1',
              translations: { vi: { label: 'Chỉ tiếng Việt', description: 'x' } },
            },
          ],
        });
      expect(incomplete.status).toBe(422);
      expect(incomplete.body.error.code).toBe('TRANSLATION_MISSING');

      const saved = await request(server())
        .put('/api/v1/admin/services/overview')
        .set(asAdmin())
        .send(overviewPayload)
        .expect(200);
      expect(saved.body.data.stats.map((item: any) => item.value)).toEqual(['50+', '5+']);

      const onlyStats = await request(server())
        .put('/api/v1/admin/services/overview')
        .set(asAdmin())
        .send({ stats: [overviewPayload.stats[1]] })
        .expect(200);
      expect(onlyStats.body.data.stats).toHaveLength(1);
      expect(onlyStats.body.data.processSteps).toHaveLength(1);
      await request(server())
        .put('/api/v1/admin/services/overview')
        .set(asAdmin())
        .send(overviewPayload)
        .expect(200);
    });

    it('serves the aggregate publicly with only published cards', async () => {
      const live = await createComplete('Trong trang tổng quan');
      await request(server())
        .post(`/api/v1/admin/services/${live.id}/publish`)
        .set(asAdmin())
        .expect(200);
      const draft = await createComplete('Nháp trang tổng quan');

      const en = await request(server())
        .get('/api/v1/public/services/overview')
        .query({ locale: 'en' })
        .expect(200);
      expect(en.body.data.stats[0]).toMatchObject({ value: '50+', label: 'Projects Delivered' });
      expect(en.body.data.processSteps[0]).toMatchObject({
        step: '01',
        title: 'Understand Your Needs',
      });
      expect(en.body.data.highlights[0].title).toBe('Cutting-Edge Technology');
      const cardSlugs = en.body.data.services.map((card: any) => card.slug);
      expect(cardSlugs).toContain(live.slug);
      expect(cardSlugs).not.toContain(draft.slug);

      const vi = await request(server()).get('/api/v1/public/services/overview').expect(200);
      expect(vi.body.data.stats[0].label).toBe('Dự án đã triển khai');
    });
  });
});
