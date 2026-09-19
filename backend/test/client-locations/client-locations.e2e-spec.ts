import request from 'supertest';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import {
  CLIENT_LOCATION_ENTITIES,
  ClientLocationsModule,
} from '../../src/modules/client-locations/client-locations.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asAdmin, asCustomer, asStaff, createMediaAsset } from '../testimonials/support';

describe('client locations (e2e)', () => {
  let context: ModuleTestingContext;
  let mediaId: string;
  const server = () => context.app.getHttpServer();
  const base = '/api/v1/admin/client-locations';

  const translations = (suffix: string) => ({
    vi: { quote: `Trích dẫn ${suffix}`, role: 'Nhóm sản phẩm', country: 'Việt Nam' },
    en: { quote: `Quote ${suffix}`, role: 'Product team', country: 'Vietnam' },
  });
  const create = (body: Record<string, unknown>, actor = asAdmin()) =>
    request(server()).post(base).set(actor).send(body);

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, ...CLIENT_LOCATION_ENTITIES],
      imports: [ClientLocationsModule],
    });
    mediaId = (await createMediaAsset(context.dataSource)).id;
  });

  afterAll(async () => {
    await context.close();
  });

  it('enforces the permission matrix (staff read only)', async () => {
    await request(server()).get(base).expect(401);
    await request(server()).get(base).set(asCustomer()).expect(403);
    await request(server()).get(base).set(asStaff()).expect(200);
    await create({ name: 'A', x: 1, y: 1 }, asStaff()).then((r) => expect(r.status).toBe(403));

    const created = await create({ name: 'Quyền', x: 10, y: 20 });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    await request(server()).get(`${base}/${id}`).set(asStaff()).expect(200);
    await request(server()).patch(`${base}/${id}`).set(asStaff()).send({ version: 1 }).expect(403);
    await request(server()).delete(`${base}/${id}`).set(asStaff()).expect(403);
    await request(server())
      .put(`${base}/reorder`)
      .set(asStaff())
      .send({ ids: [id] })
      .expect(403);
  });

  it('validates coordinates and payload', async () => {
    expect((await create({ name: 'A' })).status).toBe(400);
    expect((await create({ name: 'A', x: -0.1, y: 5 })).status).toBe(400);
    expect((await create({ name: 'A', x: 100.5, y: 5 })).status).toBe(400);
    expect((await create({ name: 'A', x: 5, y: 101 })).status).toBe(400);
    expect((await create({ name: 'A', x: 5, y: 5, latitude: 91, longitude: 0 })).status).toBe(400);
    expect((await create({ name: 'A', x: 5, y: 5, latitude: 0, longitude: 181 })).status).toBe(400);
    expect((await create({ name: 'A', x: 5, y: 5, latitude: 10 })).status).toBe(400);
    expect((await create({ name: 'A', x: 'abc', y: 5 })).status).toBe(400);
    expect((await create({ name: 'A', x: 5, y: 5, status: 'archived' })).status).toBe(400);
    expect((await create({ name: 'A'.repeat(121), x: 5, y: 5 })).status).toBe(400);
    expect(
      (await create({ name: 'A', x: 5, y: 5, avatarId: '00000000-0000-4000-8000-00000000ffff' }))
        .status,
    ).toBe(400);

    const edge = await create({ name: 'Edge', x: 0, y: 100, latitude: -90, longitude: 180 });
    expect(edge.status).toBe(201);
    expect(edge.body.data).toMatchObject({ x: 0, y: 100, latitude: -90, longitude: 180 });
  });

  it('stores decimals and media references, and protects referenced media', async () => {
    const created = await create({
      name: 'Singapore',
      x: 75.25,
      y: 53.5,
      latitude: 1.352083,
      longitude: 103.819836,
      avatarId: mediaId,
      coverImageId: mediaId,
      translations: translations('SG'),
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ x: 75.25, y: 53.5, latitude: 1.352083 });
    expect(created.body.data.avatarUrl).toContain('image-');
    expect(created.body.data.coverImageUrl).toContain('image-');
    await expect(
      context.dataSource.getRepository(MediaAsset).delete({ id: mediaId }),
    ).rejects.toThrow();
  });

  it('needs every translated field in both locales to publish', async () => {
    const draft = await create({
      name: 'Thiếu',
      x: 1,
      y: 1,
      translations: { vi: { quote: 'Chỉ Việt', role: 'r', country: 'c' } },
    });
    const publish = await request(server())
      .patch(`${base}/${draft.body.data.id}`)
      .set(asAdmin())
      .send({ version: draft.body.data.version, status: 'published' });
    expect(publish.status).toBe(422);
    expect(publish.body.error.code).toBe('TRANSLATION_MISSING');
    expect(publish.body.error.details).toEqual(
      expect.arrayContaining([
        { locale: 'en', field: 'quote' },
        { locale: 'en', field: 'role' },
        { locale: 'en', field: 'country' },
      ]),
    );
    expect((await create({ name: 'Direct', x: 1, y: 1, status: 'published' })).status).toBe(422);
  });

  it('applies optimistic locking and merges translations', async () => {
    const created = await create({ name: 'Lock', x: 5, y: 5, translations: translations('L') });
    const { id, version } = created.body.data;
    const updated = await request(server())
      .patch(`${base}/${id}`)
      .set(asAdmin())
      .send({ version, x: 6.5, status: 'published', translations: { en: { country: 'VN' } } })
      .expect(200);
    expect(updated.body.data).toMatchObject({ x: 6.5, y: 5, status: 'published' });
    expect(updated.body.data.translations.en).toMatchObject({
      country: 'VN',
      role: 'Product team',
    });
    const stale = await request(server())
      .patch(`${base}/${id}`)
      .set(asAdmin())
      .send({ version, x: 7 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    const badPatch = await request(server())
      .patch(`${base}/${id}`)
      .set(asAdmin())
      .send({ version: updated.body.data.version, latitude: 10 });
    expect(badPatch.status).toBe(400);
  });

  it('filters, searches, reorders and soft deletes', async () => {
    const a = (await create({ name: 'Ordering Alpha', x: 1, y: 1 })).body.data.id;
    const b = (await create({ name: 'Ordering Beta', x: 2, y: 2 })).body.data.id;
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

    const search = await request(server())
      .get(base)
      .query({ search: 'ordering alpha' })
      .set(asStaff())
      .expect(200);
    expect(search.body.data.map((item: any) => item.id)).toEqual([a]);
    const page = await request(server())
      .get(base)
      .query({ pageSize: 2, status: 'hidden' })
      .set(asStaff())
      .expect(200);
    expect(page.body.data).toHaveLength(2);

    await request(server()).delete(`${base}/${a}`).set(asAdmin()).expect(204);
    await request(server()).get(`${base}/${a}`).set(asAdmin()).expect(404);
    await request(server()).delete(`${base}/${a}`).set(asAdmin()).expect(404);
  });

  it('serves only published pins in the requested locale', async () => {
    const live = await create({
      name: 'Public Pin',
      x: 20,
      y: 45,
      status: 'published',
      avatarId: mediaId,
      translations: translations('P'),
    });
    expect(live.status).toBe(201);
    await create({ name: 'Hidden Pin', x: 1, y: 1, translations: translations('H') });

    const vi = await request(server()).get('/api/v1/public/client-locations').expect(200);
    const pin = vi.body.data.find((item: any) => item.name === 'Public Pin');
    expect(pin).toMatchObject({
      x: 20,
      y: 45,
      quote: 'Trích dẫn P',
      country: 'Việt Nam',
      role: 'Nhóm sản phẩm',
    });
    expect(pin.avatarUrl).toContain('image-');
    expect(vi.body.data.find((item: any) => item.name === 'Hidden Pin')).toBeUndefined();

    const en = await request(server())
      .get('/api/v1/public/client-locations')
      .query({ locale: 'en' })
      .expect(200);
    expect(en.body.data.find((item: any) => item.name === 'Public Pin').country).toBe('Vietnam');
    await request(server())
      .get('/api/v1/public/client-locations')
      .query({ locale: 'xx' })
      .expect(400);
  });
});
