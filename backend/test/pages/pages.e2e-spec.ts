import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { PageRevision } from '../../src/modules/pages/entities/page-revision.entity';
import { PageSectionMedia } from '../../src/modules/pages/entities/page-section-media.entity';
import { PageSection } from '../../src/modules/pages/entities/page-section.entity';
import { PageTranslation } from '../../src/modules/pages/entities/page-translation.entity';
import { Page } from '../../src/modules/pages/entities/page.entity';
import { PagesModule } from '../../src/modules/pages/pages.module';
import { PageSectionsService } from '../../src/modules/pages/services/page-sections.service';
import { PagesService } from '../../src/modules/pages/services/pages.service';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asTestUser } from '../support/test-authentication.guard';

const ADMIN = asTestUser({ id: '00000000-0000-4000-8000-000000000003', role: Role.ADMIN });
const STAFF = asTestUser({ id: '00000000-0000-4000-8000-000000000002', role: Role.STAFF });
const CUSTOMER = asTestUser({ id: '00000000-0000-4000-8000-000000000001', role: Role.CUSTOMER });
const MISSING_MEDIA = '00000000-0000-4000-8000-00000000ffff';

describe('pages (e2e)', () => {
  let context: ModuleTestingContext;
  let image: MediaAsset;
  const server = () => context.app.getHttpServer();
  const admin = '/api/v1/admin/pages';
  const publicBase = '/api/v1/public/pages';

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, Page, PageTranslation, PageSection, PageSectionMedia, PageRevision],
      imports: [PagesModule],
    });
    const media = context.dataSource.getRepository(MediaAsset);
    image = await media.save(
      media.create({
        originalName: 'hero.jpg',
        storageKey: 'pages/hero.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        width: 1600,
        height: 900,
        checksumSha256: 'b'.repeat(64),
        folder: null,
        variants: {
          thumbnail: {
            storageKey: 'pages/hero-thumb.jpg',
            width: 320,
            height: 180,
            sizeBytes: 10,
            mimeType: 'image/jpeg',
          },
        },
      }),
    );
  });

  afterAll(async () => {
    await context.close();
  });

  const get = (url: string, user = ADMIN) => request(server()).get(url).set(user);
  const post = (url: string, body: Record<string, unknown> = {}, user = ADMIN) =>
    request(server()).post(url).set(user).send(body);
  const patch = (url: string, body: Record<string, unknown>, user = ADMIN) =>
    request(server()).patch(url).set(user).send(body);

  const titles = { vi: { title: 'Trang' }, en: { title: 'Page' } };

  async function createPage(path: string, translations: Record<string, unknown> = titles) {
    const response = await post(admin, { path, templateKey: 'generic', translations });
    expect(response.status).toBe(201);
    return response.body.data;
  }

  const heroContent = () => ({
    shared: { backgroundImage: image.id, primaryCtaUrl: '/lien-he' },
    translations: {
      vi: { headline: 'Xin chao', backgroundImageAlt: 'Anh nen' },
      en: { headline: 'Hello' },
    },
  });

  async function addSection(pageId: string, body: Record<string, unknown>) {
    const response = await post(`${admin}/${pageId}/sections`, body);
    expect(response.status).toBe(201);
    return response.body.data;
  }

  describe('permissions', () => {
    it('applies the matrix to admin endpoints and keeps public ones open', async () => {
      await request(server()).get(admin).expect(401);
      await get(admin, CUSTOMER).expect(403);
      await get(admin, STAFF).expect(200);
      await get(`${admin}/section-types`, STAFF).expect(200);
      const page = await createPage('/permissions');
      await get(`${admin}/${page.id}`, STAFF).expect(200);
      await post(admin, { path: '/staff-page', translations: titles }, STAFF).then((r) =>
        expect(r.status).toBe(403),
      );
      await patch(`${admin}/${page.id}`, { version: page.version }, STAFF).then((r) =>
        expect(r.status).toBe(403),
      );
      await post(`${admin}/${page.id}/sections`, { type: 'hero' }, STAFF).then((r) =>
        expect(r.status).toBe(403),
      );
      await post(`${admin}/${page.id}/publish`, {}, STAFF).then((r) => expect(r.status).toBe(403));
      await request(server()).delete(`${admin}/${page.id}`).set(STAFF).expect(403);
      await request(server()).get(publicBase).expect(200);
      await request(server()).get(`${publicBase}/by-path?path=/permissions`).expect(404);
    });

    it('exposes the section type registry as json', async () => {
      const response = await get(`${admin}/section-types`).expect(200);
      const types = response.body.data.map((item: { type: string }) => item.type);
      expect(types).toEqual(
        expect.arrayContaining(['hero', 'faq', 'video-embed', 'featured-content', 'custom']),
      );
      const hero = response.body.data.find((item: { type: string }) => item.type === 'hero');
      expect(hero.fields.find((field: { key: string }) => field.key === 'headline')).toMatchObject({
        kind: 'text',
        translatable: true,
        required: true,
      });
    });
  });

  describe('paths and system protection', () => {
    it('rejects reserved, malformed and duplicate paths', async () => {
      for (const path of [
        '/admin',
        '/api/x',
        '/login',
        '/register',
        '/account',
        '/uploads',
        '/_next',
        '/Upper',
        '/a//b',
        'no-slash',
      ]) {
        const response = await post(admin, { path, translations: titles });
        expect({ path, status: response.status }).toEqual({ path, status: 400 });
      }
      await createPage('/duplicate');
      const duplicate = await post(admin, { path: '/duplicate', translations: titles });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error.code).toBe('PAGE_PATH_EXISTS');
      const noTitle = await post(admin, {
        path: '/no-title',
        translations: { en: { title: 'x' } },
      });
      expect(noTitle.status).toBe(400);
    });

    it('updates titles and SEO with optimistic locking and validates a changed path', async () => {
      const page = await createPage('/editable');
      const updated = await patch(`${admin}/${page.id}`, {
        version: page.version,
        path: '/edited',
        translations: {
          vi: { seoTitle: 'SEO vi', ogImageId: image.id },
          en: { title: 'New title' },
        },
      }).expect(200);
      expect(updated.body.data.path).toBe('/edited');
      expect(updated.body.data.translations.vi.seoTitle).toBe('SEO vi');
      expect(updated.body.data.translations.vi.title).toBe('Trang');
      expect(updated.body.data.title.en).toBe('New title');
      expect(updated.body.data.version).toBeGreaterThan(page.version);

      const stale = await patch(`${admin}/${page.id}`, { version: page.version, path: '/x-y' });
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');

      const current = updated.body.data.version;
      await patch(`${admin}/${page.id}`, { version: current, path: '/admin/secret' }).then((r) =>
        expect(r.status).toBe(400),
      );
      await patch(`${admin}/${page.id}`, { version: current, path: '/duplicate' }).then((r) =>
        expect(r.status).toBe(409),
      );
      await patch(`${admin}/${page.id}`, {
        version: current,
        translations: { vi: { ogImageId: MISSING_MEDIA } },
      }).then((r) => expect(r.status).toBe(400));
    });

    it('protects system pages and system sections', async () => {
      const pagesService = context.moduleRef.get(PagesService);
      const sectionsService = context.moduleRef.get(PageSectionsService);
      const home = await pagesService.create(
        { path: '/', templateKey: 'home', translations: titles },
        { isSystem: true },
      );
      const system = await sectionsService.add(
        home.id,
        { type: 'rich-text', sectionKey: 'intro' },
        { isSystem: true },
      );
      const custom = await addSection(home.id, { type: 'rich-text', sectionKey: 'extra' });

      const moved = await patch(`${admin}/${home.id}`, { version: home.version, path: '/start' });
      expect(moved.status).toBe(409);
      expect(moved.body.error.code).toBe('SYSTEM_RESOURCE_PROTECTED');
      const templateChange = await patch(`${admin}/${home.id}`, {
        version: home.version,
        templateKey: 'other',
      });
      expect(templateChange.status).toBe(409);
      await patch(`${admin}/${home.id}`, {
        version: home.version,
        translations: { vi: { title: 'Trang chu' } },
      }).then((r) => expect(r.status).toBe(200));

      const deletedPage = await request(server()).delete(`${admin}/${home.id}`).set(ADMIN);
      expect(deletedPage.status).toBe(409);
      expect(deletedPage.body.error.code).toBe('SYSTEM_RESOURCE_PROTECTED');

      const deletedSection = await request(server())
        .delete(`${admin}/${home.id}/sections/${system.id}`)
        .set(ADMIN);
      expect(deletedSection.status).toBe(409);
      const hidden = await patch(`${admin}/${home.id}/sections/${system.id}`, {
        version: system.version,
        isVisible: false,
      }).expect(200);
      expect(hidden.body.data.isVisible).toBe(false);
      await request(server())
        .delete(`${admin}/${home.id}/sections/${custom.id}`)
        .set(ADMIN)
        .expect(204);
    });
  });

  describe('section content validation', () => {
    let pageId: string;
    beforeAll(async () => {
      pageId = (await createPage('/validation')).id;
    });

    it('rejects unknown types, fields, bad urls, bad media and misplaced translations', async () => {
      const add = (body: Record<string, unknown>) => post(`${admin}/${pageId}/sections`, body);
      expect((await add({ type: 'carousel' })).status).toBe(400);
      expect((await add({ type: 'hero', content: { shared: { rogue: 1 } } })).status).toBe(400);
      expect(
        (await add({ type: 'hero', content: { shared: { primaryCtaUrl: 'javascript:alert(1)' } } }))
          .status,
      ).toBe(400);
      expect(
        (await add({ type: 'hero', content: { shared: { backgroundImage: MISSING_MEDIA } } }))
          .status,
      ).toBe(400);
      expect((await add({ type: 'hero', content: { shared: { headline: 'x' } } })).status).toBe(
        400,
      );
      expect((await add({ type: 'hero', content: { translations: { fr: {} } } })).status).toBe(400);
      expect(
        (await add({ type: 'custom', content: { shared: { html: '<b>x</b>' } } })).status,
      ).toBe(400);
      expect(
        (
          await add({
            type: 'hero',
            content: { translations: { vi: { headline: '<script>x</script>' } } },
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await add({
            type: 'video-embed',
            content: { shared: { videoUrl: 'http://youtube.com/x' } },
          })
        ).status,
      ).toBe(400);
      expect((await add({ type: 'hero', sectionKey: 'Bad_Key' })).status).toBe(400);
      expect((await add({ type: 'hero', unknown: true })).status).toBe(400);
    });

    it('sanitizes rich text and generates unique section keys', async () => {
      const first = await addSection(pageId, {
        type: 'custom',
        content: { translations: { vi: { body: '<p>Chao</p><script>alert(1)</script>' } } },
      });
      expect(first.sectionKey).toBe('custom');
      expect(first.draftContent.translations.vi.body).not.toContain('script');
      const second = await addSection(pageId, { type: 'custom' });
      expect(second.sectionKey).toBe('custom-2');
      const duplicate = await post(`${admin}/${pageId}/sections`, {
        type: 'custom',
        sectionKey: 'custom',
      });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error.code).toBe('SECTION_KEY_EXISTS');
    });

    it('locks section updates by version and keeps media usage in sync', async () => {
      const section = await addSection(pageId, {
        type: 'hero',
        sectionKey: 'lock-hero',
        content: heroContent(),
      });
      const links = await context.dataSource
        .getRepository(PageSectionMedia)
        .find({ where: { sectionId: section.id } });
      expect(links).toEqual([
        expect.objectContaining({ mediaAssetId: image.id, fieldKey: 'backgroundImage' }),
      ]);
      await expect(
        context.dataSource.getRepository(MediaAsset).delete({ id: image.id }),
      ).rejects.toThrow();

      const updated = await patch(`${admin}/${pageId}/sections/${section.id}`, {
        version: section.version,
        content: { shared: {}, translations: { vi: { headline: 'Moi' } } },
      }).expect(200);
      expect(updated.body.data.draftContent.shared).toEqual({});
      expect(updated.body.data.version).toBeGreaterThan(section.version);
      expect(
        await context.dataSource
          .getRepository(PageSectionMedia)
          .count({ where: { sectionId: section.id } }),
      ).toBe(0);

      const stale = await patch(`${admin}/${pageId}/sections/${section.id}`, {
        version: section.version,
        isVisible: false,
      });
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');

      await request(server())
        .delete(`${admin}/${pageId}/sections/${section.id}`)
        .set(ADMIN)
        .expect(204);
      await patch(`${admin}/${pageId}/sections/${section.id}`, {
        version: 1,
        isVisible: true,
      }).then((r) => expect(r.status).toBe(404));
    });
  });

  describe('ordering', () => {
    it('inserts at a position and reorders transactionally', async () => {
      const page = await createPage('/ordering');
      const a = await addSection(page.id, { type: 'rich-text', sectionKey: 'a' });
      const b = await addSection(page.id, { type: 'rich-text', sectionKey: 'b' });
      const c = await addSection(page.id, { type: 'rich-text', sectionKey: 'c', sortOrder: 0 });
      const keys = async () =>
        (await get(`${admin}/${page.id}`)).body.data.sections.map(
          (s: { sectionKey: string }) => s.sectionKey,
        );
      expect(await keys()).toEqual(['c', 'a', 'b']);

      const reordered = await post(`${admin}/${page.id}/sections/reorder`, {
        sectionIds: [b.id, c.id, a.id],
      });
      expect(reordered.status).toBe(200);
      expect(reordered.body.data.map((s: { sectionKey: string }) => s.sectionKey)).toEqual([
        'b',
        'c',
        'a',
      ]);
      expect(await keys()).toEqual(['b', 'c', 'a']);

      for (const sectionIds of [
        [a.id, b.id],
        [a.id, b.id, c.id, c.id],
        [a.id, b.id, MISSING_MEDIA],
      ]) {
        const response = await post(`${admin}/${page.id}/sections/reorder`, { sectionIds });
        expect(response.status).toBe(400);
      }
      expect(await keys()).toEqual(['b', 'c', 'a']);

      const moved = await patch(`${admin}/${page.id}/sections/${a.id}`, {
        version: a.version,
        sortOrder: 0,
      }).expect(200);
      expect(moved.body.data.version).toBe(a.version);
      expect(await keys()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('publishing, revisions and public output', () => {
    let pageId: string;
    let heroId: string;
    let heroVersion: number;
    let statsId: string;

    beforeAll(async () => {
      const page = await createPage('/publishing', {
        vi: { title: 'Xuat ban', seoDescription: 'Mo ta vi' },
        en: { title: 'Publishing' },
      });
      pageId = page.id;
      const hero = await addSection(pageId, {
        type: 'hero',
        sectionKey: 'hero',
        content: {
          shared: { backgroundImage: image.id },
          translations: { vi: { headline: 'Chao', backgroundImageAlt: 'Anh nen' } },
        },
      });
      heroId = hero.id;
      heroVersion = hero.version;
      const stats = await addSection(pageId, {
        type: 'stats',
        sectionKey: 'stats',
        content: {
          shared: { items: [{ id: 'projects', icon: 'rocket', value: '50+' }] },
          translations: {
            vi: { items: { projects: { label: 'Du an' } } },
            en: { items: { projects: { label: 'Projects' } } },
          },
        },
      });
      statsId = stats.id;
    });

    it('refuses to publish while required translations or fields are missing', async () => {
      const missing = await post(`${admin}/${pageId}/publish`);
      expect(missing.status).toBe(422);
      expect(missing.body.error.code).toBe('TRANSLATION_MISSING');
      expect(missing.body.error.details).toEqual([{ locale: 'en', field: 'hero.headline' }]);
      expect((await get(`${publicBase}/by-path?path=/publishing`)).status).toBe(404);

      await patch(`${admin}/${pageId}/sections/${heroId}`, {
        version: heroVersion,
        content: {
          shared: {},
          translations: { vi: { headline: 'Chao' }, en: { headline: 'Hello' } },
        },
      }).expect(200);
      const noImage = await post(`${admin}/${pageId}/publish`);
      expect(noImage.status).toBe(400);
      expect(noImage.body.error.details).toEqual([
        { field: 'hero.backgroundImage', messages: ['is required'] },
      ]);
    });

    it('requires titles in both locales', async () => {
      const page = await createPage('/only-vi', { vi: { title: 'Chi tieng Viet' } });
      const response = await post(`${admin}/${page.id}/publish`);
      expect(response.status).toBe(422);
      expect(response.body.error.details).toEqual([{ locale: 'en', field: 'title' }]);
    });

    it('publishes, writes revision 1 and serves the page in the requested locale', async () => {
      const hero = (await get(`${admin}/${pageId}`)).body.data.sections.find(
        (s: { id: string }) => s.id === heroId,
      );
      await patch(`${admin}/${pageId}/sections/${heroId}`, {
        version: hero.version,
        content: {
          shared: { backgroundImage: image.id, primaryCtaUrl: '/lien-he' },
          translations: {
            vi: { headline: 'Chao', backgroundImageAlt: 'Anh nen' },
            en: { headline: 'Hello' },
          },
        },
      }).expect(200);

      const published = await post(`${admin}/${pageId}/publish`, { note: 'first' }).expect(200);
      expect(published.body.data.status).toBe('published');
      expect(published.body.data.currentRevisionNumber).toBe(1);
      expect(published.body.data.hasUnpublishedChanges).toBe(false);

      const vi = await get(`${publicBase}/by-path?path=/publishing&locale=vi`).expect(200);
      expect(vi.body.data.title).toBe('Xuat ban');
      expect(vi.body.data.seo.description).toBe('Mo ta vi');
      expect(vi.body.data.sections.map((s: { key: string }) => s.key)).toEqual(['hero', 'stats']);
      const heroOut = vi.body.data.sections[0].content;
      expect(heroOut.headline).toBe('Chao');
      expect(heroOut.backgroundImage).toMatchObject({ width: 1600, height: 900, alt: 'Anh nen' });
      expect(heroOut.backgroundImage.url).toMatch(/pages\/hero\.jpg$/);
      expect(heroOut.backgroundImage.thumbnailUrl).toMatch(/pages\/hero-thumb\.jpg$/);
      expect(heroOut.primaryCtaUrl).toBe('/lien-he');
      expect(vi.body.data.sections[1].content.items).toEqual([
        { id: 'projects', icon: 'rocket', value: '50+', label: 'Du an' },
      ]);

      const en = await get(`${publicBase}/by-path?path=/Publishing/&locale=en`).expect(200);
      expect(en.body.data.title).toBe('Publishing');
      expect(en.body.data.sections[0].content.headline).toBe('Hello');
      expect(en.body.data.sections[1].content.items[0].label).toBe('Projects');

      const routes = await get(publicBase).expect(200);
      expect(routes.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: '/publishing', templateKey: 'generic' }),
        ]),
      );
      expect(routes.body.data.map((r: { path: string }) => r.path)).not.toContain('/validation');

      const revisions = await get(`${admin}/${pageId}/revisions`).expect(200);
      expect(revisions.body.data).toEqual([
        expect.objectContaining({ revisionNumber: 1, note: 'first', sectionCount: 2 }),
      ]);
      expect(revisions.body.data[0].snapshot).toBeUndefined();
      const detail = await get(`${admin}/${pageId}/revisions/1`).expect(200);
      expect(detail.body.data.snapshot.page.path).toBe('/publishing');
      await get(`${admin}/${pageId}/revisions/9`).expect(404);
    });

    it('keeps drafts private, applies structure changes live and hides hidden sections', async () => {
      const detail = (await get(`${admin}/${pageId}`)).body.data;
      const hero = detail.sections.find((s: { id: string }) => s.id === heroId);
      await patch(`${admin}/${pageId}/sections/${heroId}`, {
        version: hero.version,
        content: {
          shared: hero.draftContent.shared,
          translations: { vi: { headline: 'Ban nhap' }, en: { headline: 'Draft' } },
        },
      }).expect(200);

      const live = await get(`${publicBase}/by-path?path=/publishing`).expect(200);
      expect(live.body.data.sections[0].content.headline).toBe('Chao');
      const preview = await get(`${admin}/${pageId}/preview?locale=en`).expect(200);
      expect(preview.body.data.sections[0].content.headline).toBe('Draft');
      expect((await get(`${admin}/${pageId}`)).body.data.hasUnpublishedChanges).toBe(true);

      const stats = (await get(`${admin}/${pageId}`)).body.data.sections.find(
        (s: { id: string }) => s.id === statsId,
      );
      await patch(`${admin}/${pageId}/sections/${statsId}`, {
        version: stats.version,
        isVisible: false,
      }).expect(200);
      const hidden = await get(`${publicBase}/by-path?path=/publishing`).expect(200);
      expect(hidden.body.data.sections.map((s: { key: string }) => s.key)).toEqual(['hero']);
      const refreshed = (await get(`${admin}/${pageId}`)).body.data.sections.find(
        (s: { id: string }) => s.id === statsId,
      );
      await patch(`${admin}/${pageId}/sections/${statsId}`, {
        version: refreshed.version,
        isVisible: true,
      }).expect(200);
    });

    it('discards the draft back to the published content', async () => {
      const discarded = await post(`${admin}/${pageId}/discard-draft`).expect(200);
      expect(discarded.body.data.hasUnpublishedChanges).toBe(false);
      const hero = discarded.body.data.sections.find((s: { id: string }) => s.id === heroId);
      expect(hero.draftContent.translations.vi.headline).toBe('Chao');
    });

    it('reverts a revision into the drafts without publishing', async () => {
      const hero = (await get(`${admin}/${pageId}`)).body.data.sections.find(
        (s: { id: string }) => s.id === heroId,
      );
      await patch(`${admin}/${pageId}/sections/${heroId}`, {
        version: hero.version,
        content: {
          shared: hero.draftContent.shared,
          translations: { vi: { headline: 'Phien ban 2' }, en: { headline: 'Version 2' } },
        },
      }).expect(200);
      await post(`${admin}/${pageId}/publish`, { note: 'second' }).expect(200);
      expect(
        (await get(`${publicBase}/by-path?path=/publishing&locale=en`)).body.data.sections[0]
          .content.headline,
      ).toBe('Version 2');

      const reverted = await post(`${admin}/${pageId}/revisions/1/revert`).expect(200);
      const revertedHero = reverted.body.data.sections.find((s: { id: string }) => s.id === heroId);
      expect(revertedHero.draftContent.translations.en.headline).toBe('Hello');
      expect(revertedHero.publishedContent.translations.en.headline).toBe('Version 2');
      expect(reverted.body.data.currentRevisionNumber).toBe(2);
      expect(
        (await get(`${publicBase}/by-path?path=/publishing&locale=en`)).body.data.sections[0]
          .content.headline,
      ).toBe('Version 2');

      const revisions = await get(`${admin}/${pageId}/revisions`).expect(200);
      expect(revisions.body.data.map((r: { revisionNumber: number }) => r.revisionNumber)).toEqual([
        2, 1,
      ]);
      expect(
        await context.dataSource.getRepository(PageRevision).count({ where: { pageId } }),
      ).toBe(2);
      await post(`${admin}/${pageId}/revisions/7/revert`).then((r) => expect(r.status).toBe(404));
    });

    it('takes a page offline and deletes custom pages', async () => {
      const off = await post(`${admin}/${pageId}/unpublish`).expect(200);
      expect(off.body.data.status).toBe('draft');
      await get(`${publicBase}/by-path?path=/publishing`).then((r) => expect(r.status).toBe(404));

      const sectionCount = await context.dataSource.getRepository(PageSectionMedia).count();
      expect(sectionCount).toBeGreaterThan(0);
      await request(server()).delete(`${admin}/${pageId}`).set(ADMIN).expect(204);
      await get(`${admin}/${pageId}`).then((r) => expect(r.status).toBe(404));
      await createPage('/publishing');
    });
  });

  describe('listing', () => {
    it('filters, searches, sorts and paginates the page list', async () => {
      await createPage('/list-alpha', { vi: { title: 'Alpha vi' }, en: { title: 'Alpha' } });
      await createPage('/list-bravo', { vi: { title: 'Bravo vi' }, en: { title: 'Bravo' } });
      const search = await get(`${admin}?search=bravo`).expect(200);
      expect(search.body.data.map((p: { path: string }) => p.path)).toEqual(['/list-bravo']);
      const byTitle = await get(`${admin}?search=Alpha%20vi`).expect(200);
      expect(byTitle.body.data.map((p: { path: string }) => p.path)).toEqual(['/list-alpha']);

      const published = await get(`${admin}?status=published`).expect(200);
      expect(published.body.data.every((p: { status: string }) => p.status === 'published')).toBe(
        true,
      );
      const page = await get(`${admin}?pageSize=2&page=2&sortBy=path&sortOrder=asc`).expect(200);
      expect(page.body.meta).toMatchObject({ page: 2, pageSize: 2 });
      expect(page.body.data).toHaveLength(2);
      await get(`${admin}?status=archived`).then((r) => expect(r.status).toBe(400));
      const summary = search.body.data[0];
      expect(summary).toMatchObject({
        title: { vi: 'Bravo vi', en: 'Bravo' },
        sectionCount: 0,
        hasUnpublishedChanges: false,
      });
    });
  });
});
