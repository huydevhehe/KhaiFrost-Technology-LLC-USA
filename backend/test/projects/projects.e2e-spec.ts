import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { PROJECT_SUBMITTED_FOR_REVIEW_EVENT } from '../../src/modules/projects/constants/project.constants';
import { PROJECT_ENTITIES, ProjectsModule } from '../../src/modules/projects/projects.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asTestUser } from '../support/test-authentication.guard';
import { asAdmin, asCustomer, asStaff, createMediaAsset } from '../testimonials/support';

@Injectable()
class ReviewEventRecorder {
  readonly events: { projectId: string; title: string; authorId: string | null }[] = [];

  @OnEvent(PROJECT_SUBMITTED_FOR_REVIEW_EVENT)
  record(event: { projectId: string; title: string; authorId: string | null }): void {
    this.events.push(event);
  }
}

const OTHER_STAFF_ID = '00000000-0000-4000-8000-0000000000b2';
const asOtherStaff = () => asTestUser({ id: OTHER_STAFF_ID, role: Role.STAFF });

describe('projects (e2e)', () => {
  let context: ModuleTestingContext;
  let recorder: ReviewEventRecorder;
  let mediaIds: string[];
  let categoryId: string;
  const server = () => context.app.getHttpServer();
  const base = '/api/v1/admin/projects';
  const categoriesUrl = '/api/v1/admin/project-categories';

  const translations = (suffix = 'A') => ({
    vi: { title: `Dự án ${suffix}`, summary: `Tóm tắt ${suffix}`, industry: 'Bán lẻ' },
    en: { title: `Project ${suffix}`, summary: `Summary ${suffix}`, industry: 'Retail' },
  });
  const create = (body: Record<string, unknown> = {}, actor = asAdmin()) =>
    request(server())
      .post(base)
      .set(actor)
      .send({ translations: translations(), ...body });
  const post = (path: string, actor = asAdmin()) => request(server()).post(path).set(actor);

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, ...PROJECT_ENTITIES],
      imports: [ProjectsModule],
      providers: [ReviewEventRecorder],
    });
    recorder = context.moduleRef.get(ReviewEventRecorder);
    mediaIds = [];
    for (let i = 0; i < 3; i++) mediaIds.push((await createMediaAsset(context.dataSource)).id);
    const category = await request(server())
      .post(categoriesUrl)
      .set(asAdmin())
      .send({ translations: { vi: { name: 'AI & Tự động hoá' }, en: { name: 'AI & Automation' } } })
      .expect(201);
    categoryId = category.body.data.id;
  });

  afterAll(async () => {
    await context.close();
  });

  describe('permissions and ownership', () => {
    it('applies the matrix', async () => {
      await request(server()).get(base).expect(401);
      await request(server()).get(base).set(asCustomer()).expect(403);
      await request(server()).get(base).set(asStaff()).expect(200);

      const draft = (await create({}, asStaff())).body.data;
      expect(draft.status).toBe('draft');
      expect(draft.createdById).toBeTruthy();
      await post(`${base}/${draft.id}/publish`, asStaff()).expect(403);
      await post(`${base}/${draft.id}/archive`, asStaff()).expect(403);
      await post(`${base}/${draft.id}/reject`, asStaff()).expect(403);
      await request(server()).delete(`${base}/${draft.id}`).set(asStaff()).expect(403);
      await request(server())
        .put(`${base}/reorder`)
        .set(asStaff())
        .send({ ids: [draft.id] })
        .expect(403);
      await request(server()).post(categoriesUrl).set(asStaff()).send({}).expect(403);
      await request(server()).get(categoriesUrl).set(asStaff()).expect(200);
    });

    it('lets staff edit only their own drafts and never featured or order', async () => {
      const own = (await create({}, asStaff())).body.data;
      const patch = (id: string, body: Record<string, unknown>, actor = asStaff()) =>
        request(server()).patch(`${base}/${id}`).set(actor).send(body);

      const ok = await patch(own.id, { version: own.version, clientName: 'ACME' });
      expect(ok.status).toBe(200);
      expect(ok.body.data.clientName).toBe('ACME');

      expect((await patch(own.id, { version: ok.body.data.version }, asOtherStaff())).status).toBe(
        403,
      );
      expect((await patch(own.id, { version: ok.body.data.version, featured: true })).status).toBe(
        403,
      );
      expect((await patch(own.id, { version: ok.body.data.version, sortOrder: 3 })).status).toBe(
        403,
      );
      expect((await create({ featured: true }, asStaff())).status).toBe(403);

      const adminEdit = await patch(
        own.id,
        { version: ok.body.data.version, featured: true },
        asAdmin(),
      );
      expect(adminEdit.status).toBe(200);
      expect(adminEdit.body.data.featured).toBe(true);

      const foreign = (await create({}, asOtherStaff())).body.data;
      await post(`${base}/${foreign.id}/submit-for-review`, asStaff()).expect(403);
    });

    it('requires update-any to edit content after submission or publishing', async () => {
      const draft = (await create({}, asStaff())).body.data;
      const submitted = await post(`${base}/${draft.id}/submit-for-review`, asStaff()).expect(200);
      expect(submitted.body.data.status).toBe('in_review');
      const locked = await request(server())
        .patch(`${base}/${draft.id}`)
        .set(asStaff())
        .send({ version: submitted.body.data.version, clientName: 'Sau khi gửi' });
      expect(locked.status).toBe(403);
      const adminEdit = await request(server())
        .patch(`${base}/${draft.id}`)
        .set(asAdmin())
        .send({ version: submitted.body.data.version, clientName: 'Admin sửa' });
      expect(adminEdit.status).toBe(200);
    });
  });

  describe('workflow', () => {
    it('submits for review (emitting an event), rejects, publishes, unpublishes, archives', async () => {
      const before = recorder.events.length;
      const draft = (await create({}, asStaff())).body.data;
      const id = draft.id;
      await post(`${base}/${id}/submit-for-review`, asStaff()).expect(200);
      expect(recorder.events).toHaveLength(before + 1);
      expect(recorder.events[before]).toMatchObject({ projectId: id, title: 'Dự án A' });
      expect(recorder.events[before].authorId).toBe(draft.createdById);
      expect((await post(`${base}/${id}/submit-for-review`, asStaff())).status).toBe(409);

      expect((await post(`${base}/${id}/reject`)).body.data.status).toBe('draft');
      await post(`${base}/${id}/submit-for-review`, asStaff()).expect(200);
      const published = await post(`${base}/${id}/publish`).expect(200);
      expect(published.body.data.status).toBe('published');
      expect(published.body.data.publishedAt).toBeTruthy();

      const invalid = await post(`${base}/${id}/publish`);
      expect(invalid.status).toBe(409);
      expect(invalid.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect((await post(`${base}/${id}/reject`)).status).toBe(409);

      expect((await post(`${base}/${id}/unpublish`)).body.data.status).toBe('draft');
      expect((await post(`${base}/${id}/archive`)).body.data.status).toBe('archived');
      expect((await post(`${base}/${id}/publish`)).status).toBe(409);
      expect((await post(`${base}/${id}/unpublish`)).body.data.status).toBe('draft');
    });

    it('needs both locales for title, summary and section texts to publish', async () => {
      const created = await create({
        translations: {
          vi: { title: 'Chỉ tiếng Việt', summary: 'Có' },
          en: { title: 'Only title' },
        },
        sections: [
          {
            translations: {
              vi: { heading: 'Thách thức', bodyHtml: '<p>Nội dung</p>' },
              en: { heading: 'Challenge' },
            },
          },
        ],
      });
      expect(created.status).toBe(201);
      const publish = await post(`${base}/${created.body.data.id}/publish`);
      expect(publish.status).toBe(422);
      expect(publish.body.error.code).toBe('TRANSLATION_MISSING');
      expect(publish.body.error.details).toEqual(
        expect.arrayContaining([
          { locale: 'en', field: 'summary' },
          { locale: 'en', field: 'sections[0].bodyHtml' },
        ]),
      );
      expect(
        (publish.body.error.details as { locale: string }[]).every((d) => d.locale === 'en'),
      ).toBe(true);
    });

    it('keeps a published project complete when it is edited', async () => {
      const created = (await create()).body.data;
      const published = (await post(`${base}/${created.id}/publish`).expect(200)).body.data;
      const broken = await request(server())
        .patch(`${base}/${published.id}`)
        .set(asAdmin())
        .send({ version: published.version, translations: { en: { summary: '' } } });
      expect(broken.status).toBe(422);
      const stored = await request(server()).get(`${base}/${published.id}`).set(asAdmin());
      expect(stored.body.data.translations.en.summary).toBe('Summary A');
    });
  });

  describe('content', () => {
    it('validates the payload', async () => {
      const bad: Record<string, unknown>[] = [
        {},
        { translations: { en: { title: 'English only' } } },
        { demoUrl: 'javascript:alert(1)' },
        { demoUrl: 'ftp://example.com' },
        { videoUrl: '/relative' },
        { completedAt: '15/06/2025' },
        { technologies: ['x'.repeat(51)] },
        { technologies: new Array(21).fill('a') },
        { videoDuration: 'long' },
        { galleryMediaIds: [mediaIds[0], mediaIds[0]] },
        { galleryMediaIds: ['nope'] },
        { categoryId: 'nope' },
        { clientName: 'x'.repeat(151) },
        { unexpected: true },
      ];
      for (const overrides of bad) {
        const body =
          'translations' in overrides || Object.keys(overrides).length === 0
            ? overrides
            : { translations: translations(), ...overrides };
        const response = await request(server()).post(base).set(asAdmin()).send(body);
        expect(response.status).toBe(400);
      }
      const unknownCategory = await create({ categoryId: '00000000-0000-4000-8000-00000000ffff' });
      expect(unknownCategory.status).toBe(400);
      const unknownMedia = await create({ thumbnailId: '00000000-0000-4000-8000-00000000ffff' });
      expect(unknownMedia.status).toBe(400);
    });

    it('stores every field, orders the gallery, sanitizes rich text and protects media', async () => {
      const response = await create({
        slug: 'ai-receptionist-full',
        categoryId,
        thumbnailId: mediaIds[0],
        galleryMediaIds: [mediaIds[2], mediaIds[0], mediaIds[1]],
        clientName: 'SmilePlus Dental',
        technologies: ['OpenAI', 'Twilio', 'Next.js'],
        demoUrl: '/lien-he',
        videoUrl: 'https://videos.example.com/demo.mp4',
        hasVideo: true,
        videoDuration: '02:32',
        completedAt: '2025-06-15',
        translations: {
          vi: {
            title: 'AI Lễ Tân',
            summary: 'Trợ lý AI',
            industry: 'Nha khoa',
            descriptionHtml:
              '<p>Xin chào</p><script>alert(1)</script><a href="javascript:x">bad</a>',
            seoTitle: 'AI Lễ Tân | KhaiFrost',
          },
          en: { title: 'AI Receptionist', summary: 'AI assistant', industry: 'Dental' },
        },
        sections: [
          {
            translations: {
              vi: { heading: 'Thách thức', bodyHtml: '<p>Một</p><img src="x" onerror="y">' },
              en: { heading: 'Challenge', bodyHtml: '<p>One</p>' },
            },
          },
          {
            translations: {
              vi: { heading: 'Giải pháp', bodyHtml: '<p>Hai</p>' },
              en: { heading: 'Solution', bodyHtml: '<p>Two</p>' },
            },
          },
        ],
      });
      expect(response.status).toBe(201);
      const data = response.body.data;
      expect(data).toMatchObject({
        slug: 'ai-receptionist-full',
        categoryId,
        clientName: 'SmilePlus Dental',
        technologies: ['OpenAI', 'Twilio', 'Next.js'],
        demoUrl: '/lien-he',
        hasVideo: true,
        videoDuration: '02:32',
        completedAt: '2025-06-15',
      });
      expect(data.thumbnailUrl).toContain('image-');
      expect(data.gallery.map((image: any) => image.mediaAssetId)).toEqual([
        mediaIds[2],
        mediaIds[0],
        mediaIds[1],
      ]);
      expect(data.translations.vi.descriptionHtml).toContain('<p>Xin chào</p>');
      expect(data.translations.vi.descriptionHtml).not.toContain('script');
      expect(data.translations.vi.descriptionHtml).not.toContain('javascript');
      expect(data.sections.map((section: any) => section.translations.en.heading)).toEqual([
        'Challenge',
        'Solution',
      ]);
      expect(data.sections[0].translations.vi.bodyHtml).not.toContain('onerror');

      await expect(
        context.dataSource.getRepository(MediaAsset).delete({ id: mediaIds[2] }),
      ).rejects.toThrow();

      const reordered = await request(server())
        .patch(`${base}/${data.id}`)
        .set(asAdmin())
        .send({ version: data.version, galleryMediaIds: [mediaIds[1]], sections: [] })
        .expect(200);
      expect(reordered.body.data.gallery).toHaveLength(1);
      expect(reordered.body.data.sections).toHaveLength(0);
      expect(reordered.body.data.translations.vi.title).toBe('AI Lễ Tân');
    });

    it('generates unique slugs, rejects reserved and duplicate ones', async () => {
      const first = (await create({ translations: translations('Trùng tên') })).body.data;
      const second = (await create({ translations: translations('Trùng tên') })).body.data;
      expect(first.slug).toBe('du-an-trung-ten');
      expect(second.slug).toBe('du-an-trung-ten-2');
      expect((await create({ slug: first.slug })).status).toBe(409);
      expect((await create({ slug: 'slugs' })).status).toBe(400);
      const clash = await request(server())
        .patch(`${base}/${second.id}`)
        .set(asAdmin())
        .send({ version: second.version, slug: first.slug });
      expect(clash.status).toBe(409);
    });

    it('applies optimistic locking', async () => {
      const created = (await create()).body.data;
      const updated = await request(server())
        .patch(`${base}/${created.id}`)
        .set(asAdmin())
        .send({ version: created.version, clientName: 'Một' })
        .expect(200);
      expect(updated.body.data.version).toBeGreaterThan(created.version);
      const stale = await request(server())
        .patch(`${base}/${created.id}`)
        .set(asAdmin())
        .send({ version: created.version, clientName: 'Hai' });
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    });

    it('lists with filters, search and pagination, reorders and soft deletes', async () => {
      const a = (await create({ translations: translations('Tìm kiếm Alpha'), categoryId })).body
        .data;
      const b = (await create({ translations: translations('Tìm kiếm Beta') })).body.data;
      const search = await request(server())
        .get(base)
        .query({ search: 'tìm kiếm alpha' })
        .set(asStaff())
        .expect(200);
      expect(search.body.data.map((item: any) => item.id)).toEqual([a.id]);
      expect(search.body.data[0].titles).toEqual({
        vi: 'Dự án Tìm kiếm Alpha',
        en: 'Project Tìm kiếm Alpha',
      });
      expect(
        (await request(server()).get(base).query({ search: '%' }).set(asStaff())).body.data,
      ).toHaveLength(0);
      const byCategory = await request(server())
        .get(base)
        .query({ categoryId })
        .set(asStaff())
        .expect(200);
      expect(byCategory.body.data.every((item: any) => item.categoryId === categoryId)).toBe(true);
      const mine = await request(server())
        .get(base)
        .query({ mine: 'true' })
        .set(asStaff())
        .expect(200);
      expect(mine.body.data.every((item: any) => item.createdById !== null)).toBe(true);
      const paged = await request(server())
        .get(base)
        .query({ pageSize: 2 })
        .set(asStaff())
        .expect(200);
      expect(paged.body.data).toHaveLength(2);
      await request(server()).get(base).query({ status: 'nope' }).set(asStaff()).expect(400);

      const reorder = await request(server())
        .put(`${base}/reorder`)
        .set(asAdmin())
        .send({ ids: [b.id, a.id] })
        .expect(200);
      expect(reorder.body.data.slice(0, 2)).toEqual([b.id, a.id]);
      await request(server()).put(`${base}/reorder`).set(asAdmin()).send({ ids: [] }).expect(400);
      await request(server())
        .put(`${base}/reorder`)
        .set(asAdmin())
        .send({ ids: ['00000000-0000-4000-8000-00000000ffff'] })
        .expect(400);

      await request(server()).delete(`${base}/${a.id}`).set(asAdmin()).expect(204);
      await request(server()).get(`${base}/${a.id}`).set(asAdmin()).expect(404);
      await request(server()).delete(`${base}/${a.id}`).set(asAdmin()).expect(404);
    });
  });

  describe('categories', () => {
    it('needs both names, protects categories in use and applies locking', async () => {
      const incomplete = await request(server())
        .post(categoriesUrl)
        .set(asAdmin())
        .send({ translations: { vi: { name: 'Chỉ tiếng Việt' } } });
      expect(incomplete.status).toBe(422);
      expect(incomplete.body.error.code).toBe('TRANSLATION_MISSING');

      const created = (
        await request(server())
          .post(categoriesUrl)
          .set(asAdmin())
          .send({ translations: { vi: { name: 'Bảo mật' }, en: { name: 'Security' } } })
          .expect(201)
      ).body.data;
      expect(created.slug).toBe('bao-mat');
      await request(server())
        .post(categoriesUrl)
        .set(asAdmin())
        .send({ slug: 'bao-mat', translations: { vi: { name: 'x' }, en: { name: 'y' } } })
        .expect(409);

      const updated = await request(server())
        .patch(`${categoriesUrl}/${created.id}`)
        .set(asAdmin())
        .send({ version: created.version, translations: { en: { name: 'Cybersecurity' } } })
        .expect(200);
      expect(updated.body.data.translations.en.name).toBe('Cybersecurity');
      expect(updated.body.data.translations.vi.name).toBe('Bảo mật');
      const stale = await request(server())
        .patch(`${categoriesUrl}/${created.id}`)
        .set(asAdmin())
        .send({ version: created.version, sortOrder: 5 });
      expect(stale.status).toBe(409);
      const blank = await request(server())
        .patch(`${categoriesUrl}/${created.id}`)
        .set(asAdmin())
        .send({ version: updated.body.data.version, translations: { vi: { name: '' } } });
      expect(blank.status).toBe(422);

      const project = (await create({ categoryId: created.id })).body.data;
      const inUse = await request(server()).delete(`${categoriesUrl}/${created.id}`).set(asAdmin());
      expect(inUse.status).toBe(409);
      await request(server()).delete(`${base}/${project.id}`).set(asAdmin()).expect(204);
      await context.dataSource.query('UPDATE projects SET category_id = NULL WHERE id = $1', [
        project.id,
      ]);
      await request(server()).delete(`${categoriesUrl}/${created.id}`).set(asAdmin()).expect(204);
      await request(server()).get(`${categoriesUrl}/${created.id}`).set(asAdmin()).expect(404);
    });
  });

  describe('public API', () => {
    let liveSlug: string;
    let featuredSlug: string;

    beforeAll(async () => {
      const live = (
        await create({
          translations: translations('Công khai'),
          categoryId,
          thumbnailId: mediaIds[0],
          technologies: ['Terraform', 'AWS'],
          demoUrl: '/lien-he',
          clientName: 'Khách A',
          completedAt: '2025-01-10',
          galleryMediaIds: [mediaIds[1], mediaIds[0]],
        })
      ).body.data;
      await post(`${base}/${live.id}/publish`).expect(200);
      liveSlug = live.slug;

      const featured = (
        await create({
          translations: translations('Nổi bật'),
          featured: true,
          hasVideo: true,
          videoDuration: '02:32',
        })
      ).body.data;
      await post(`${base}/${featured.id}/publish`).expect(200);
      featuredSlug = featured.slug;

      await create({ translations: translations('Bản nháp công khai') });
    });

    it('lists only published projects in the requested locale with filters', async () => {
      const vi = await request(server()).get('/api/v1/public/projects').expect(200);
      const titles = vi.body.data.map((item: any) => item.title);
      expect(titles).toContain('Dự án Công khai');
      expect(titles).not.toContain('Dự án Bản nháp công khai');
      expect(vi.body.meta.pageSize).toBe(12);

      const card = vi.body.data.find((item: any) => item.slug === liveSlug);
      expect(card).toMatchObject({
        summary: 'Tóm tắt Công khai',
        technologies: ['Terraform', 'AWS'],
        demoUrl: '/lien-he',
        clientName: 'Khách A',
        industry: 'Bán lẻ',
        completedAt: '2025-01-10',
        category: { slug: 'ai-tu-dong-hoa', name: 'AI & Tự động hoá' },
      });
      expect(card.thumbnailUrl).toContain('image-');

      const en = await request(server())
        .get('/api/v1/public/projects')
        .query({ locale: 'en' })
        .expect(200);
      expect(en.body.data.find((item: any) => item.slug === liveSlug).category.name).toBe(
        'AI & Automation',
      );

      const byCategory = await request(server())
        .get('/api/v1/public/projects')
        .query({ category: 'ai-tu-dong-hoa' })
        .expect(200);
      expect(byCategory.body.data.map((item: any) => item.slug)).toEqual([liveSlug]);
      const unknown = await request(server())
        .get('/api/v1/public/projects')
        .query({ category: 'khong-co' })
        .expect(200);
      expect(unknown.body.data).toEqual([]);

      const featured = await request(server())
        .get('/api/v1/public/projects')
        .query({ featured: 'true' })
        .expect(200);
      expect(featured.body.data.map((item: any) => item.slug)).toEqual([featuredSlug]);
      expect(featured.body.data[0]).toMatchObject({ hasVideo: true, videoDuration: '02:32' });

      const paged = await request(server())
        .get('/api/v1/public/projects')
        .query({ pageSize: 1, page: 2 })
        .expect(200);
      expect(paged.body.data).toHaveLength(1);
      expect(paged.body.meta).toMatchObject({ page: 2, pageSize: 1 });
      await request(server()).get('/api/v1/public/projects').query({ pageSize: 51 }).expect(400);
      await request(server()).get('/api/v1/public/projects').query({ locale: 'de' }).expect(400);
    });

    it('serves detail by slug, slugs and categories', async () => {
      const detail = await request(server()).get(`/api/v1/public/projects/${liveSlug}`).expect(200);
      expect(detail.body.data.title).toBe('Dự án Công khai');
      expect(detail.body.data.gallery).toHaveLength(2);
      expect(detail.body.data.gallery[0].url).toContain('image-');
      const en = await request(server())
        .get(`/api/v1/public/projects/${liveSlug}`)
        .query({ locale: 'en' })
        .expect(200);
      expect(en.body.data.title).toBe('Project Công khai');

      await request(server()).get('/api/v1/public/projects/khong-ton-tai').expect(404);
      const drafts = await context.dataSource.query(
        "SELECT slug FROM projects WHERE status = 'draft' AND deleted_at IS NULL LIMIT 1",
      );
      await request(server()).get(`/api/v1/public/projects/${drafts[0].slug}`).expect(404);

      const slugs = await request(server()).get('/api/v1/public/projects/slugs').expect(200);
      const slugList = slugs.body.data.map((row: any) => row.slug);
      expect(slugList).toEqual(expect.arrayContaining([liveSlug, featuredSlug]));
      expect(slugList).not.toContain(drafts[0].slug);

      const categories = await request(server())
        .get('/api/v1/public/projects/categories')
        .expect(200);
      expect(categories.body.data.find((row: any) => row.slug === 'ai-tu-dong-hoa')).toMatchObject({
        name: 'AI & Tự động hoá',
        projectCount: 1,
      });
    });

    it('hides a project again when it is unpublished or deleted', async () => {
      const temp = (await create({ translations: translations('Tạm thời') })).body.data;
      await post(`${base}/${temp.id}/publish`).expect(200);
      await request(server()).get(`/api/v1/public/projects/${temp.slug}`).expect(200);
      await post(`${base}/${temp.id}/unpublish`).expect(200);
      await request(server()).get(`/api/v1/public/projects/${temp.slug}`).expect(404);
      await post(`${base}/${temp.id}/publish`).expect(200);
      await request(server()).delete(`${base}/${temp.id}`).set(asAdmin()).expect(204);
      await request(server()).get(`/api/v1/public/projects/${temp.slug}`).expect(404);
    });
  });
});
