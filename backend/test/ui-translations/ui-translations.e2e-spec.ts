import request from 'supertest';
import { Locale } from '../../src/common/enums/locale.enum';
import { Role } from '../../src/common/enums/role.enum';
import { UiTranslation } from '../../src/modules/ui-translations/entities/ui-translation.entity';
import { UiTranslationsService } from '../../src/modules/ui-translations/services/ui-translations.service';
import { UiTranslationsModule } from '../../src/modules/ui-translations/ui-translations.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asTestUser } from '../support/test-authentication.guard';

const ADMIN = asTestUser({ id: '00000000-0000-4000-8000-000000000003', role: Role.ADMIN });
const STAFF = asTestUser({ id: '00000000-0000-4000-8000-000000000002', role: Role.STAFF });
const CUSTOMER = asTestUser({ id: '00000000-0000-4000-8000-000000000001', role: Role.CUSTOMER });

describe('ui-translations (e2e)', () => {
  let context: ModuleTestingContext;
  const server = () => context.app.getHttpServer();
  const base = '/api/v1/admin/ui-translations';

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [UiTranslation],
      imports: [UiTranslationsModule],
    });
  });

  afterAll(async () => {
    await context.close();
  });

  async function create(body: Record<string, unknown>) {
    return request(server()).post(base).set(ADMIN).send(body);
  }

  describe('permissions', () => {
    it('rejects anonymous and customers, lets staff read but not write, admins do both', async () => {
      await request(server()).get(base).expect(401);
      await request(server()).get(base).set(CUSTOMER).expect(403);
      await request(server()).get(base).set(STAFF).expect(200);
      await request(server()).get(`${base}/missing`).set(STAFF).expect(200);
      await request(server()).get(`${base}/namespaces`).set(STAFF).expect(200);
      await request(server())
        .post(base)
        .set(STAFF)
        .send({ namespace: 'perm', key: 'a' })
        .expect(403);
      await request(server())
        .post(`${base}/import`)
        .set(STAFF)
        .send({ locale: 'vi', bundle: {} })
        .expect(403);
      await request(server()).get(base).set(ADMIN).expect(200);
    });
  });

  describe('create and update', () => {
    it('creates, rejects duplicates and clashing key paths', async () => {
      const created = await create({
        namespace: 'crud',
        key: 'hero.title',
        valueVi: 'Xin chao',
        valueEn: 'Hello',
        description: 'Home hero',
      }).then((response) => {
        expect(response.status).toBe(201);
        return response.body.data;
      });
      expect(created.missingLocales).toEqual([]);

      const duplicate = await create({ namespace: 'crud', key: 'hero.title' });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error.code).toBe('UI_TRANSLATION_EXISTS');

      const asParent = await create({ namespace: 'crud', key: 'hero.title.sub' });
      expect(asParent.status).toBe(409);
      expect(asParent.body.error.code).toBe('UI_TRANSLATION_KEY_CONFLICT');

      const asChild = await create({ namespace: 'crud', key: 'hero' });
      expect(asChild.status).toBe(409);
      expect(asChild.body.error.code).toBe('UI_TRANSLATION_KEY_CONFLICT');

      await create({ namespace: 'other', key: 'hero.title' }).then((r) =>
        expect(r.status).toBe(201),
      );
    });

    it('validates namespace, key format and unknown fields', async () => {
      expect((await create({ namespace: 'bad space', key: 'a' })).status).toBe(400);
      expect((await create({ namespace: 'crud', key: 'a..b' })).status).toBe(400);
      expect((await create({ namespace: 'crud', key: 'ok', unknown: 1 })).status).toBe(400);
    });

    it('requires the same {{placeholders}} in vi and en', async () => {
      const mismatch = await create({
        namespace: 'placeholders',
        key: 'why',
        valueVi: 'Tai sao chon {{category}}',
        valueEn: 'Why {{name}}',
      });
      expect(mismatch.status).toBe(400);
      expect(mismatch.body.error.code).toBe('VALIDATION_FAILED');

      const ok = await create({
        namespace: 'placeholders',
        key: 'why',
        valueVi: 'Tai sao chon {{ category }}',
        valueEn: 'Why {{category}}',
      });
      expect(ok.status).toBe(201);

      const update = await request(server())
        .patch(`${base}/${ok.body.data.id}`)
        .set(ADMIN)
        .send({ version: ok.body.data.version, valueEn: 'Why choose us' });
      expect(update.status).toBe(400);
    });

    it('updates with optimistic locking and clears empty values', async () => {
      const created = (await create({ namespace: 'lock', key: 'a', valueVi: 'a', valueEn: 'b' }))
        .body.data;
      const updated = await request(server())
        .patch(`${base}/${created.id}`)
        .set(ADMIN)
        .send({ version: created.version, valueEn: '  ' })
        .expect(200);
      expect(updated.body.data.valueEn).toBeNull();
      expect(updated.body.data.missingLocales).toEqual(['en']);

      const stale = await request(server())
        .patch(`${base}/${created.id}`)
        .set(ADMIN)
        .send({ version: created.version, valueEn: 'again' });
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    });
  });

  describe('listing', () => {
    beforeAll(async () => {
      await create({ namespace: 'list', key: 'alpha', valueVi: 'Mot', valueEn: 'One' });
      await create({ namespace: 'list', key: 'bravo', valueVi: 'Hai', valueEn: null });
      await create({ namespace: 'list', key: 'charlie', valueVi: null, valueEn: 'Three' });
      await create({ namespace: 'list', key: 'delta_x', valueVi: 'x', valueEn: 'y' });
    });

    it('filters by namespace, search and missing locale', async () => {
      const all = await request(server()).get(`${base}?namespace=list&pageSize=50`).set(ADMIN);
      expect(all.body.data.map((row: { key: string }) => row.key)).toEqual([
        'alpha',
        'bravo',
        'charlie',
        'delta_x',
      ]);
      expect(all.body.meta.total).toBe(4);

      const search = await request(server()).get(`${base}?namespace=list&search=_`).set(ADMIN);
      expect(search.body.data).toHaveLength(1);

      const searchValue = await request(server()).get(`${base}?search=hai`).set(ADMIN);
      expect(searchValue.body.data.map((row: { key: string }) => row.key)).toEqual(['bravo']);

      const missingEn = await request(server()).get(`${base}?namespace=list&missing=en`).set(ADMIN);
      expect(missingEn.body.data.map((row: { key: string }) => row.key)).toEqual(['bravo']);

      const missingAny = await request(server())
        .get(`${base}?namespace=list&missing=any`)
        .set(ADMIN);
      expect(missingAny.body.data).toHaveLength(2);
    });

    it('paginates and sorts only by allow-listed fields', async () => {
      const page = await request(server())
        .get(`${base}?namespace=list&pageSize=2&page=2&sortBy=key&sortOrder=asc`)
        .set(ADMIN);
      expect(page.body.data.map((row: { key: string }) => row.key)).toEqual(['charlie', 'delta_x']);
      expect(page.body.meta).toMatchObject({ page: 2, pageSize: 2, total: 4, totalPages: 2 });

      await request(server()).get(`${base}?sortBy=valueVi;drop`).set(ADMIN).expect(400);
      await request(server())
        .get(`${base}?namespace=list&sortBy=description`)
        .set(ADMIN)
        .expect(200);
    });

    it('lists missing translations and namespace counts', async () => {
      const missing = await request(server()).get(`${base}/missing?namespace=list`).set(ADMIN);
      expect(missing.body.data.map((row: { key: string }) => row.key)).toEqual([
        'bravo',
        'charlie',
      ]);

      const missingVi = await request(server())
        .get(`${base}/missing?namespace=list&locale=vi`)
        .set(ADMIN);
      expect(missingVi.body.data.map((row: { key: string }) => row.key)).toEqual(['charlie']);

      const namespaces = await request(server()).get(`${base}/namespaces`).set(ADMIN);
      const list = namespaces.body.data.find(
        (row: { namespace: string }) => row.namespace === 'list',
      );
      expect(list).toEqual({ namespace: 'list', total: 4, missingVi: 1, missingEn: 1 });
    });
  });

  describe('import and system protection', () => {
    it('imports nested json without overwriting existing texts by default', async () => {
      const service = context.moduleRef.get(UiTranslationsService);
      const first = await service.importResourceBundle(
        Locale.EN,
        { nav: { home: 'Home', about: 'About' }, title: 'Site', why: 'Why {{category}}' },
        { namespace: 'imported', markAsSystem: true },
      );
      expect(first).toMatchObject({ created: 4, updated: 0, skipped: 0 });

      const vi = await service.importResourceBundle(
        Locale.VI,
        { nav: { home: 'Trang chu' }, why: 'Tai sao {{name}}' },
        { namespace: 'imported' },
      );
      expect(vi).toMatchObject({ created: 0, updated: 2, skipped: 0 });
      expect(vi.placeholderMismatches).toEqual(['why']);

      const again = await service.importResourceBundle(
        Locale.EN,
        { nav: { home: 'Changed' }, title: 'Site' },
        { namespace: 'imported' },
      );
      expect(again).toMatchObject({ updated: 0, skipped: 2 });

      const overwrite = await service.importResourceBundle(
        Locale.EN,
        { nav: { home: 'Changed' } },
        { namespace: 'imported', overwrite: true },
      );
      expect(overwrite.updated).toBe(1);

      const clash = await service.importResourceBundle(
        Locale.EN,
        { nav: { home: { deeper: 'x' } } },
        { namespace: 'imported' },
      );
      expect(clash.conflicts).toEqual(['nav.home.deeper']);
    });

    it('imports through the endpoint and protects system texts from deletion', async () => {
      const imported = await request(server())
        .post(`${base}/import`)
        .set(ADMIN)
        .send({ locale: 'en', namespace: 'viaapi', bundle: { a: { b: 'B' } } })
        .expect(200);
      expect(imported.body.data.created).toBe(1);
      await request(server())
        .post(`${base}/import`)
        .set(ADMIN)
        .send({ locale: 'en', bundle: { 'a.b': 'invalid dotted key' } })
        .expect(400);

      const system = await context.dataSource
        .getRepository(UiTranslation)
        .findOneByOrFail({ namespace: 'imported', key: 'title' });
      const denied = await request(server()).delete(`${base}/${system.id}`).set(ADMIN);
      expect(denied.status).toBe(409);
      expect(denied.body.error.code).toBe('SYSTEM_RESOURCE_PROTECTED');

      const custom = (
        await create({ namespace: 'custom', key: 'temp', valueVi: 'a', valueEn: 'b' })
      ).body.data;
      await request(server()).delete(`${base}/${custom.id}`).set(ADMIN).expect(204);
      await request(server()).get(`${base}/${custom.id}`).set(ADMIN).expect(404);
      await create({ namespace: 'custom', key: 'temp' }).then((r) => expect(r.status).toBe(201));
    });
  });

  describe('public bundle', () => {
    beforeAll(async () => {
      await create({
        namespace: 'pub',
        key: 'hero.headline',
        valueVi: 'Xay dung',
        valueEn: 'Build',
      });
      await create({ namespace: 'pub', key: 'hero.cta', valueVi: 'Xem', valueEn: null });
      await create({ namespace: 'pub', key: 'footer', valueVi: null, valueEn: 'Footer' });
    });

    it('returns an i18next bundle without the envelope and skips empty texts', async () => {
      const vi = await request(server()).get('/api/v1/public/ui-translations/vi').expect(200);
      expect(vi.body.pub).toEqual({ hero: { headline: 'Xay dung', cta: 'Xem' } });
      expect(vi.body.data).toBeUndefined();
      const en = await request(server()).get('/api/v1/public/ui-translations/en').expect(200);
      expect(en.body.pub).toEqual({ hero: { headline: 'Build' }, footer: 'Footer' });
    });

    it('supports a single namespace, rejects unknown locales', async () => {
      const namespaceBundle = await request(server())
        .get('/api/v1/public/ui-translations/en/pub')
        .expect(200);
      expect(namespaceBundle.body).toEqual({ hero: { headline: 'Build' }, footer: 'Footer' });
      await request(server()).get('/api/v1/public/ui-translations/fr').expect(400);
      await request(server()).get('/api/v1/public/ui-translations/en/bad%20ns').expect(400);
    });

    it('sends ETag and Cache-Control and answers 304 for a matching validator', async () => {
      const first = await request(server()).get('/api/v1/public/ui-translations/vi').expect(200);
      expect(first.headers['cache-control']).toContain('max-age');
      const etag = first.headers.etag;
      expect(etag).toBeTruthy();
      await request(server())
        .get('/api/v1/public/ui-translations/vi')
        .set('If-None-Match', etag)
        .expect(304);

      await create({ namespace: 'pub', key: 'extra', valueVi: 'them', valueEn: 'more' });
      const changed = await request(server())
        .get('/api/v1/public/ui-translations/vi')
        .set('If-None-Match', etag)
        .expect(200);
      expect(changed.headers.etag).not.toBe(etag);
    });
  });
});
