import request from 'supertest';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import {
  TESTIMONIAL_ENTITIES,
  TestimonialsModule,
} from '../../src/modules/testimonials/testimonials.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asAdmin, asCustomer, asStaff, createMediaAsset } from './support';

describe('testimonials (e2e)', () => {
  let context: ModuleTestingContext;
  let mediaId: string;
  const server = () => context.app.getHttpServer();
  const base = '/api/v1/admin/testimonials';

  const bilingual = (quoteVi: string, quoteEn: string) => ({
    vi: { quote: quoteVi, authorRole: 'Giám đốc' },
    en: { quote: quoteEn, authorRole: 'Director' },
  });
  const create = (body: Record<string, unknown>, actor = asAdmin()) =>
    request(server()).post(base).set(actor).send(body);

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, ...TESTIMONIAL_ENTITIES],
      imports: [TestimonialsModule],
    });
    mediaId = (await createMediaAsset(context.dataSource)).id;
  });

  afterAll(async () => {
    await context.close();
  });

  it('enforces the permission matrix', async () => {
    await request(server()).get(base).expect(401);
    await request(server()).get(base).set(asCustomer()).expect(403);
    await request(server()).get(base).set(asStaff()).expect(200);

    const created = await create({ authorName: 'Ai đó' }, asStaff());
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('hidden');
    expect(created.body.data.createdById).toBeTruthy();
    const id = created.body.data.id;

    await request(server()).patch(`${base}/${id}`).set(asStaff()).send({ version: 1 }).expect(403);
    await request(server()).delete(`${base}/${id}`).set(asStaff()).expect(403);
    await request(server())
      .put(`${base}/reorder`)
      .set(asStaff())
      .send({ ids: [id] })
      .expect(403);
    await request(server()).delete(`${base}/${id}`).set(asAdmin()).expect(204);
  });

  it('stops staff from creating published testimonials', async () => {
    const response = await create(
      { authorName: 'Nhân viên', status: 'published', translations: bilingual('a', 'b') },
      asStaff(),
    );
    expect(response.status).toBe(403);
  });

  it('validates input', async () => {
    expect((await create({})).status).toBe(400);
    expect((await create({ authorName: 'A', rating: 6 })).status).toBe(400);
    expect((await create({ authorName: 'A', rating: 0 })).status).toBe(400);
    expect((await create({ authorName: 'A', rating: 4.5 })).status).toBe(400);
    expect((await create({ authorName: 'A', status: 'archived' })).status).toBe(400);
    expect((await create({ authorName: 'A'.repeat(121) })).status).toBe(400);
    expect((await create({ authorName: 'A', extra: 1 })).status).toBe(400);
    const badMedia = await create({
      authorName: 'A',
      avatarId: '00000000-0000-4000-8000-00000000ffff',
    });
    expect(badMedia.status).toBe(400);
  });

  it('needs both quotes to publish', async () => {
    const draft = await create({
      authorName: 'Thiếu tiếng Anh',
      translations: { vi: { quote: 'Chỉ tiếng Việt' } },
    });
    expect(draft.status).toBe(201);
    const publish = await request(server())
      .patch(`${base}/${draft.body.data.id}`)
      .set(asAdmin())
      .send({ version: draft.body.data.version, status: 'published' });
    expect(publish.status).toBe(422);
    expect(publish.body.error.code).toBe('TRANSLATION_MISSING');
    expect(publish.body.error.details).toEqual([{ locale: 'en', field: 'quote' }]);

    const direct = await create({ authorName: 'X', status: 'published' });
    expect(direct.status).toBe(422);
  });

  it('updates with optimistic locking and merges translations', async () => {
    const created = await create({
      authorName: 'Khoá phiên bản',
      rating: 4,
      avatarId: mediaId,
      location: 'Houston',
      translations: bilingual('Tốt', 'Good'),
    });
    const { id, version } = created.body.data;
    expect(created.body.data.avatarUrl).toContain('image-');

    const updated = await request(server())
      .patch(`${base}/${id}`)
      .set(asAdmin())
      .send({ version, rating: 5, status: 'published', translations: { en: { quote: 'Great' } } })
      .expect(200);
    expect(updated.body.data).toMatchObject({ rating: 5, status: 'published' });
    expect(updated.body.data.translations.en).toEqual({ quote: 'Great', authorRole: 'Director' });

    const stale = await request(server())
      .patch(`${base}/${id}`)
      .set(asAdmin())
      .send({ version, rating: 1 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('protects referenced media', async () => {
    await create({ authorName: 'Ảnh', avatarId: mediaId });
    await expect(
      context.dataSource.getRepository(MediaAsset).delete({ id: mediaId }),
    ).rejects.toThrow();
  });

  it('filters, searches, reorders and soft deletes', async () => {
    const a = (await create({ authorName: 'Sắp xếp Alpha', company: 'Zed Co' })).body.data.id;
    const b = (await create({ authorName: 'Sắp xếp Beta' })).body.data.id;
    const reorder = await request(server())
      .put(`${base}/reorder`)
      .set(asAdmin())
      .send({ ids: [b, a] })
      .expect(200);
    expect(reorder.body.data.slice(0, 2)).toEqual([b, a]);
    await request(server()).put(`${base}/reorder`).set(asAdmin()).send({ ids: [] }).expect(400);
    await request(server())
      .put(`${base}/reorder`)
      .set(asAdmin())
      .send({ ids: ['00000000-0000-4000-8000-00000000ffff'] })
      .expect(400);

    const found = await request(server())
      .get(base)
      .query({ search: 'zed' })
      .set(asAdmin())
      .expect(200);
    expect(found.body.data.map((item: any) => item.id)).toEqual([a]);
    const none = await request(server())
      .get(base)
      .query({ search: '%' })
      .set(asAdmin())
      .expect(200);
    expect(none.body.data).toHaveLength(0);
    const hidden = await request(server())
      .get(base)
      .query({ status: 'hidden', pageSize: 1 })
      .set(asAdmin())
      .expect(200);
    expect(hidden.body.data).toHaveLength(1);
    expect(hidden.body.meta.pageSize).toBe(1);

    await request(server()).delete(`${base}/${a}`).set(asAdmin()).expect(204);
    await request(server()).get(`${base}/${a}`).set(asAdmin()).expect(404);
    await request(server()).delete(`${base}/${a}`).set(asAdmin()).expect(404);
  });

  it('serves only published testimonials in the requested locale, in order', async () => {
    const first = await create({
      authorName: 'Công khai 1',
      status: 'published',
      rating: 5,
      location: 'Vietnam',
      translations: bilingual('Rất tốt', 'Very good'),
    });
    const second = await create({
      authorName: 'Công khai 2',
      status: 'published',
      translations: bilingual('Tuyệt', 'Great'),
    });
    await create({ authorName: 'Ẩn', translations: bilingual('Ẩn', 'Hidden') });
    await request(server())
      .put(`${base}/reorder`)
      .set(asAdmin())
      .send({ ids: [second.body.data.id, first.body.data.id] })
      .expect(200);

    const vi = await request(server()).get('/api/v1/public/testimonials').expect(200);
    const names = vi.body.data.map((item: any) => item.authorName);
    expect(names.slice(0, 2)).toEqual(['Công khai 2', 'Công khai 1']);
    expect(names).not.toContain('Ẩn');
    expect(vi.body.data[1]).toMatchObject({
      quote: 'Rất tốt',
      authorRole: 'Giám đốc',
      location: 'Vietnam',
    });
    expect(vi.body.meta.total).toBe(vi.body.data.length);

    const en = await request(server())
      .get('/api/v1/public/testimonials')
      .query({ locale: 'en' })
      .expect(200);
    expect(en.body.data[1].quote).toBe('Very good');
    await request(server()).get('/api/v1/public/testimonials').query({ locale: 'de' }).expect(400);
    await request(server())
      .get('/api/v1/public/testimonials')
      .query({ pageSize: 1000 })
      .expect(400);
  });
});
