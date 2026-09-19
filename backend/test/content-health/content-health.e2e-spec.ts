import request from 'supertest';
import { PublicationStatus } from '../../src/common/enums/publication-status.enum';
import { ContactStatus } from '../../src/modules/contacts/entities/contact.entity';
import { ContentHealthModule } from '../../src/modules/content-health/content-health.module';
import { PageStatus } from '../../src/modules/pages/constants/page-status';
import { Contact } from '../../src/modules/contacts/entities/contact.entity';
import { Post } from '../../src/modules/posts/entities/post.entity';
import { Product } from '../../src/modules/products/entities/product.entity';
import { TestimonialStatus } from '../../src/modules/testimonials/entities/testimonial.entity';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import {
  as,
  backdate,
  daysAgo,
  daysFromNow,
  hoursAgo,
  OPERATIONS_ENTITIES,
  resetDatabase,
  seedContact,
  seedMedia,
  seedNavigationMenu,
  seedPage,
  seedPost,
  seedProduct,
  seedProject,
  seedService,
  seedSetting,
  seedTestimonial,
  TEST_USERS,
} from '../dashboard/support/operations-fixtures';

interface Issue {
  code: string;
  severity: string;
  entity: string;
  count: number;
  sampleIds: string[];
}

describe('content health (e2e)', () => {
  let context: ModuleTestingContext;
  const server = () => context.app.getHttpServer();
  const adminUrl = '/api/v1/admin/content-health';
  const publicUrl = '/api/v1/public/content-health';
  const realNow = Date.now.bind(Date);
  let clockOffsetMs = 0;

  const report = async () => {
    const response = await request(server()).get(adminUrl).set(as(TEST_USERS.admin)).expect(200);
    return response.body.data as {
      hasPublishedPosts: boolean;
      hasPublishedProducts: boolean;
      hasPublishedProjects: boolean;
      hasPublishedServices: boolean;
      hasPublishedTestimonials: boolean;
      counts: Record<string, number>;
      issues: Issue[];
    };
  };
  const issueOf = async (code: string): Promise<Issue | undefined> =>
    (await report()).issues.find((issue) => issue.code === code);

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: OPERATIONS_ENTITIES,
      imports: [ContentHealthModule],
    });
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + clockOffsetMs);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await context.close();
  });

  beforeEach(async () => {
    await resetDatabase(context.dataSource, context.schema);
    // Jumping the clock guarantees the 60 second public cache of an earlier test has expired
    clockOffsetMs += 2 * 60_000;
  });

  describe('permission matrix', () => {
    it('admin report rejects anonymous callers and customers', async () => {
      await request(server()).get(adminUrl).expect(401);
      await request(server()).get(adminUrl).set(as(TEST_USERS.customer)).expect(403);
    });

    it.each([
      ['staff', TEST_USERS.staff],
      ['admin', TEST_USERS.admin],
      ['owner', TEST_USERS.owner],
    ])('admin report is readable by %s', async (_name, user) => {
      await request(server()).get(adminUrl).set(as(user)).expect(200);
    });

    it('public flags need no authentication', async () => {
      await request(server()).get(publicUrl).expect(200);
    });
  });

  describe('published checklist', () => {
    it('reports nothing published on an empty site', async () => {
      const data = await report();
      expect(data).toMatchObject({
        hasPublishedPosts: false,
        hasPublishedProducts: false,
        hasPublishedProjects: false,
        hasPublishedServices: false,
        hasPublishedTestimonials: false,
        counts: { posts: 0, products: 0, projects: 0, services: 0, testimonials: 0 },
      });
    });

    it('counts only items visible to the public site', async () => {
      const { dataSource } = context;
      await seedPost(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedPost(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedPost(dataSource, {
        status: PublicationStatus.PUBLISHED,
        publishedAt: daysFromNow(3),
      });
      await seedPost(dataSource, { status: PublicationStatus.PUBLISHED, deleted: true });
      await seedPost(dataSource, { status: PublicationStatus.DRAFT });
      await seedProduct(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedProduct(dataSource, { status: PublicationStatus.IN_REVIEW });
      await seedProject(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedProject(dataSource, { status: PublicationStatus.ARCHIVED });
      await seedService(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedTestimonial(dataSource, { status: TestimonialStatus.PUBLISHED });
      await seedTestimonial(dataSource, { status: TestimonialStatus.HIDDEN });

      const data = await report();

      expect(data.counts).toEqual({
        posts: 2,
        products: 1,
        projects: 1,
        services: 1,
        testimonials: 1,
      });
      expect(data).toMatchObject({
        hasPublishedPosts: true,
        hasPublishedProducts: true,
        hasPublishedProjects: true,
        hasPublishedServices: true,
        hasPublishedTestimonials: true,
      });
    });
  });

  describe('issue detection', () => {
    it('flags missing navigation menus and the company settings group', async () => {
      let data = await report();
      const codes = data.issues.map((issue) => issue.code);
      expect(codes).toEqual(
        expect.arrayContaining([
          'navigation.header_missing',
          'navigation.footer_missing',
          'settings.company_missing',
        ]),
      );

      await seedNavigationMenu(context.dataSource, 'header');
      await seedSetting(context.dataSource, 'company');
      data = await report();
      const remaining = data.issues.map((issue) => issue.code);
      expect(remaining).toContain('navigation.footer_missing');
      expect(remaining).not.toContain('navigation.header_missing');
      expect(remaining).not.toContain('settings.company_missing');

      await seedNavigationMenu(context.dataSource, 'footer');
      expect((await report()).issues.map((issue) => issue.code)).not.toContain(
        'navigation.footer_missing',
      );
    });

    it('returns no editorial issue for a complete published post', async () => {
      const media = await seedMedia(context.dataSource, { altText: { vi: 'Ảnh', en: 'Photo' } });
      await seedPost(context.dataSource, {
        status: PublicationStatus.PUBLISHED,
        coverImageId: media.id,
      });
      const codes = (await report()).issues.map((issue) => issue.code);
      expect(codes.filter((code) => code.startsWith('posts.'))).toEqual([]);
      expect(codes).not.toContain('media.missing_alt_text');
    });

    it.each([
      ['posts', seedPost, 'Post'],
      ['projects', seedProject, 'Project'],
      ['services', seedService, 'ServiceCategory'],
    ] as const)(
      'flags published %s missing a translation as critical',
      async (prefix, seed, entity) => {
        const { dataSource } = context;
        const missingEnglish = await seed(dataSource, {
          status: PublicationStatus.PUBLISHED,
          titles: { vi: 'Chỉ có tiếng Việt' },
        });
        const blankEnglish = await seed(dataSource, {
          status: PublicationStatus.PUBLISHED,
          titles: { vi: 'Tiêu đề', en: '   ' },
        });
        await seed(dataSource, { status: PublicationStatus.PUBLISHED });
        await seed(dataSource, { status: PublicationStatus.DRAFT, titles: { vi: 'Nháp' } });
        await seed(dataSource, {
          status: PublicationStatus.PUBLISHED,
          titles: { vi: 'Đã xoá' },
          deleted: true,
        });

        const issue = await issueOf(`${prefix}.published_missing_translation`);

        expect(issue).toMatchObject({ severity: 'critical', entity, count: 2 });
        expect(issue?.sampleIds.sort()).toEqual([missingEnglish.id, blankEnglish.id].sort());
      },
    );

    it('flags published products missing a translation', async () => {
      const product = await seedProduct(context.dataSource, {
        status: PublicationStatus.PUBLISHED,
        names: { en: 'Only English' },
        withPrice: true,
      });
      const issue = await issueOf('products.published_missing_translation');
      expect(issue).toMatchObject({ severity: 'critical', entity: 'Product', count: 1 });
      expect(issue?.sampleIds).toEqual([product.id]);
    });

    it('limits the sample to 5 ids while counting every row', async () => {
      for (let index = 0; index < 7; index += 1) {
        await seedPost(context.dataSource, {
          status: PublicationStatus.PUBLISHED,
          titles: { vi: `Bài ${index}` },
        });
      }
      const issue = await issueOf('posts.published_missing_translation');
      expect(issue?.count).toBe(7);
      expect(issue?.sampleIds).toHaveLength(5);
    });

    it('flags drafts untouched for more than 14 days', async () => {
      const { dataSource } = context;
      const stale = await seedPost(dataSource, { status: PublicationStatus.DRAFT });
      await backdate(dataSource, Post, stale.id, { updatedAt: daysAgo(15) });
      const fresh = await seedPost(dataSource, { status: PublicationStatus.DRAFT });
      await backdate(dataSource, Post, fresh.id, { updatedAt: daysAgo(13) });

      const issue = await issueOf('posts.stale_drafts');

      expect(issue).toMatchObject({ severity: 'info', entity: 'Post', count: 1 });
      expect(issue?.sampleIds).toEqual([stale.id]);
    });

    it('flags items waiting in review for more than 3 days', async () => {
      const { dataSource } = context;
      const waiting = await seedProduct(dataSource, { status: PublicationStatus.IN_REVIEW });
      await backdate(dataSource, Product, waiting.id, { updatedAt: daysAgo(4) });
      const recent = await seedProduct(dataSource, { status: PublicationStatus.IN_REVIEW });
      await backdate(dataSource, Product, recent.id, { updatedAt: daysAgo(2) });

      const issue = await issueOf('products.review_waiting');

      expect(issue).toMatchObject({ severity: 'warning', entity: 'Product', count: 1 });
      expect(issue?.sampleIds).toEqual([waiting.id]);
    });

    it('flags published items without a cover image', async () => {
      const { dataSource } = context;
      const media = await seedMedia(dataSource, { altText: { vi: 'a', en: 'a' } });
      const withoutCover = await seedProject(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedProject(dataSource, { status: PublicationStatus.PUBLISHED, thumbnailId: media.id });
      await seedProject(dataSource, { status: PublicationStatus.DRAFT });

      const issue = await issueOf('projects.published_without_cover');

      expect(issue).toMatchObject({ severity: 'warning', entity: 'Project', count: 1 });
      expect(issue?.sampleIds).toEqual([withoutCover.id]);
    });

    it('flags published products with no price unless the price is on request', async () => {
      const { dataSource } = context;
      const unpriced = await seedProduct(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedProduct(dataSource, { status: PublicationStatus.PUBLISHED, withPrice: true });
      await seedProduct(dataSource, {
        status: PublicationStatus.PUBLISHED,
        priceOnRequest: true,
      });
      await seedProduct(dataSource, { status: PublicationStatus.DRAFT });

      const issue = await issueOf('products.published_without_price');

      expect(issue).toMatchObject({ severity: 'warning', entity: 'Product', count: 1 });
      expect(issue?.sampleIds).toEqual([unpriced.id]);
    });

    it('flags pages without a visible section and pages that are not published', async () => {
      const { dataSource } = context;
      const empty = await seedPage(dataSource, { path: '/empty' });
      const hiddenOnly = await seedPage(dataSource, { path: '/hidden', hiddenSections: 2 });
      await seedPage(dataSource, { path: '/good', visibleSections: 1, hiddenSections: 1 });
      const draft = await seedPage(dataSource, {
        path: '/draft',
        status: PageStatus.DRAFT,
        visibleSections: 1,
      });
      await seedPage(dataSource, { path: '/gone', deleted: true });

      const noSections = await issueOf('pages.no_visible_section');
      const unpublished = await issueOf('pages.not_published');

      expect(noSections).toMatchObject({ severity: 'warning', entity: 'Page', count: 2 });
      expect(noSections?.sampleIds.sort()).toEqual([empty.id, hiddenOnly.id].sort());
      expect(unpublished?.count).toBe(1);
      expect(unpublished?.sampleIds).toEqual([draft.id]);
    });

    it('flags contacts still new after 48 hours', async () => {
      const { dataSource } = context;
      const overdue = await seedContact(dataSource, { status: ContactStatus.NEW });
      await backdate(dataSource, Contact, overdue.id, { createdAt: hoursAgo(49) });
      await seedContact(dataSource, { status: ContactStatus.NEW });
      const handled = await seedContact(dataSource, { status: ContactStatus.SEEN });
      await backdate(dataSource, Contact, handled.id, { createdAt: hoursAgo(100) });
      const spam = await seedContact(dataSource, { status: ContactStatus.NEW, isSpam: true });
      await backdate(dataSource, Contact, spam.id, { createdAt: hoursAgo(100) });

      const issue = await issueOf('contacts.new_overdue');

      expect(issue).toMatchObject({ severity: 'warning', entity: 'Contact', count: 1 });
      expect(issue?.sampleIds).toEqual([overdue.id]);
    });

    it('flags images without alt text but ignores documents and deleted assets', async () => {
      const { dataSource } = context;
      const bare = await seedMedia(dataSource);
      await seedMedia(dataSource, { altText: { vi: 'Mô tả' } });
      const blank = await seedMedia(dataSource, { altText: { vi: '  ', en: '' } });
      await seedMedia(dataSource, { mimeType: 'application/pdf' });
      await seedMedia(dataSource, { deleted: true });

      const issue = await issueOf('media.missing_alt_text');

      expect(issue).toMatchObject({ severity: 'info', entity: 'MediaAsset', count: 2 });
      expect(issue?.sampleIds.sort()).toEqual([bare.id, blank.id].sort());
    });

    it('ignores soft-deleted rows in every editorial check', async () => {
      const { dataSource } = context;
      await seedPost(dataSource, { status: PublicationStatus.PUBLISHED, deleted: true });
      await seedProduct(dataSource, { status: PublicationStatus.PUBLISHED, deleted: true });
      const codes = (await report()).issues.map((issue) => issue.code);
      expect(codes.filter((code) => /^(posts|products)\./.test(code))).toEqual([]);
    });
  });

  describe('public flags', () => {
    const flags = async () => (await request(server()).get(publicUrl).expect(200)).body.data;

    it('returns only booleans and no internal counters', async () => {
      const data = await flags();
      expect(data).toEqual({
        hasPosts: false,
        hasProducts: false,
        hasProjects: false,
        hasServices: false,
        hasTestimonials: false,
      });
    });

    it('reflects published content only', async () => {
      const { dataSource } = context;
      await seedPost(dataSource, { status: PublicationStatus.DRAFT });
      await seedProduct(dataSource, {
        status: PublicationStatus.PUBLISHED,
        publishedAt: daysFromNow(2),
      });
      await seedTestimonial(dataSource, { status: TestimonialStatus.HIDDEN });
      expect(await flags()).toEqual({
        hasPosts: false,
        hasProducts: false,
        hasProjects: false,
        hasServices: false,
        hasTestimonials: false,
      });

      clockOffsetMs += 2 * 60_000;
      await seedPost(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedProject(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedService(dataSource, { status: PublicationStatus.PUBLISHED });
      await seedTestimonial(dataSource, { status: TestimonialStatus.PUBLISHED });
      expect(await flags()).toEqual({
        hasPosts: true,
        hasProducts: false,
        hasProjects: true,
        hasServices: true,
        hasTestimonials: true,
      });
    });

    it('caches the answer for 60 seconds', async () => {
      const { dataSource } = context;
      expect((await flags()).hasPosts).toBe(false);

      await seedPost(dataSource, { status: PublicationStatus.PUBLISHED });
      expect((await flags()).hasPosts).toBe(false);

      clockOffsetMs += 59_000;
      expect((await flags()).hasPosts).toBe(false);

      clockOffsetMs += 2_000;
      expect((await flags()).hasPosts).toBe(true);
    });
  });
});
