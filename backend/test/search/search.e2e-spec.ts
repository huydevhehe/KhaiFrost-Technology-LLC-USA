import request from 'supertest';
import { PublicationStatus } from '../../src/common/enums/publication-status.enum';
import { Role } from '../../src/common/enums/role.enum';
import { SearchModule } from '../../src/modules/search/search.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import {
  as,
  daysFromNow,
  OPERATIONS_ENTITIES,
  resetDatabase,
  seedContact,
  seedMedia,
  seedPage,
  seedPost,
  seedProduct,
  seedProject,
  seedService,
  seedTestimonial,
  seedUser,
  TEST_USERS,
} from '../dashboard/support/operations-fixtures';

interface AdminHit {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
}

interface PublicHit {
  type: string;
  title: string;
  excerpt: string;
  slug: string;
  publicPath: string;
}

describe('search (e2e)', () => {
  let context: ModuleTestingContext;
  const server = () => context.app.getHttpServer();
  const adminUrl = '/api/v1/admin/search';
  const publicUrl = '/api/v1/public/search';

  const adminSearch = async (
    query: string,
    user = TEST_USERS.admin as { id: string; role: Role },
  ) => {
    const response = await request(server()).get(`${adminUrl}?${query}`).set(as(user)).expect(200);
    return { hits: response.body.data as AdminHit[], meta: response.body.meta };
  };
  const typesOf = (hits: AdminHit[]) => [...new Set(hits.map((hit) => hit.type))].sort();
  const publicSearch = async (query: string) => {
    const response = await request(server()).get(`${publicUrl}?${query}`).expect(200);
    return response.body.data as PublicHit[];
  };

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: OPERATIONS_ENTITIES,
      imports: [SearchModule],
    });
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(async () => {
    await resetDatabase(context.dataSource, context.schema);
  });

  describe('admin search', () => {
    it('rejects anonymous callers and customers', async () => {
      await request(server()).get(`${adminUrl}?q=alpha`).expect(401);
      await request(server()).get(`${adminUrl}?q=alpha`).set(as(TEST_USERS.customer)).expect(403);
    });

    it.each([
      ['a missing query', ''],
      ['a one character query', 'q=a'],
      ['a query over 100 characters', `q=${'a'.repeat(101)}`],
      ['a limit above 10', 'q=alpha&limit=11'],
      ['a limit of zero', 'q=alpha&limit=0'],
      ['an unknown type', 'q=alpha&types=bogus'],
      ['an unknown parameter', 'q=alpha&sort=title'],
    ])('rejects %s with 400', async (_name, query) => {
      await request(server()).get(`${adminUrl}?${query}`).set(as(TEST_USERS.admin)).expect(400);
    });

    it('trims the query before validating its length', async () => {
      await request(server()).get(`${adminUrl}?q=%20a%20`).set(as(TEST_USERS.admin)).expect(400);
    });

    it('finds posts by title in either language, drafts included, with an admin route', async () => {
      const { dataSource } = context;
      const draft = await seedPost(dataSource, {
        status: PublicationStatus.DRAFT,
        titles: { vi: 'Tự động hoá quy trình', en: 'Workflow automation' },
      });
      await seedPost(dataSource, { titles: { vi: 'Chuyện khác', en: 'Something else' } });

      const byVietnamese = await adminSearch(`q=${encodeURIComponent('hoá quy')}`);
      const byEnglish = await adminSearch('q=automation');

      for (const { hits } of [byVietnamese, byEnglish]) {
        expect(hits).toHaveLength(1);
        expect(hits[0]).toMatchObject({
          type: 'posts',
          id: draft.id,
          title: 'Tự động hoá quy trình',
          url: `/admin/blog/${draft.id}`,
        });
      }
    });

    it('falls back to the English title when Vietnamese is empty', async () => {
      const post = await seedPost(context.dataSource, { titles: { en: 'Only English title' } });
      const { hits } = await adminSearch('q=English');
      expect(hits).toEqual([expect.objectContaining({ id: post.id, title: 'Only English title' })]);
    });

    it('searches products, projects, services, testimonials, pages and media', async () => {
      const { dataSource } = context;
      const product = await seedProduct(dataSource, {
        names: { vi: 'Zeta phần mềm', en: 'Zeta app' },
      });
      const project = await seedProject(dataSource, {
        titles: { vi: 'Zeta dự án', en: 'Zeta project' },
      });
      const service = await seedService(dataSource, {
        titles: { vi: 'Zeta dịch vụ', en: 'Zeta service' },
      });
      const testimonial = await seedTestimonial(dataSource, { authorName: 'Bà Zeta' });
      const page = await seedPage(dataSource, {
        path: '/zeta-landing',
        titles: { vi: 'Trang Zeta', en: 'Zeta page' },
      });
      const media = await seedMedia(dataSource, { originalName: 'zeta-banner.png' });

      const { hits, meta } = await adminSearch('q=zeta');
      const urls = Object.fromEntries(hits.map((hit) => [hit.type, hit.url]));

      expect(urls).toEqual({
        products: `/admin/products/${product.id}`,
        projects: `/admin/projects/${project.id}`,
        services: `/admin/services/${service.id}`,
        testimonials: `/admin/testimonials/${testimonial.id}`,
        pages: `/admin/pages/${page.id}`,
        media: `/admin/media/${media.id}`,
      });
      expect(meta.counts).toMatchObject({ products: 1, projects: 1, services: 1, media: 1 });
    });

    it('matches pages by path and media by display name', async () => {
      const { dataSource } = context;
      const page = await seedPage(dataSource, { path: '/gioi-thieu-doi-ngu' });
      const media = await seedMedia(dataSource, {
        originalName: 'IMG_0001.jpg',
        displayName: 'Ảnh đội ngũ',
      });

      const pages = await adminSearch('q=doi-ngu');
      const assets = await adminSearch(`q=${encodeURIComponent('đội ngũ')}`);

      expect(pages.hits).toEqual([
        expect.objectContaining({ id: page.id, title: '/gioi-thieu-doi-ngu' }),
      ]);
      expect(assets.hits).toEqual([
        expect.objectContaining({ id: media.id, title: 'Ảnh đội ngũ' }),
      ]);
    });

    it('matches contacts by name, email and subject', async () => {
      const { dataSource } = context;
      const byName = await seedContact(dataSource, { fullName: 'Kappa Người Gửi' });
      const byEmail = await seedContact(dataSource, { email: 'kappa@example.org' });
      const bySubject = await seedContact(dataSource, { subject: 'Báo giá Kappa' });
      await seedContact(dataSource, { fullName: 'Người Khác' });

      const { hits } = await adminSearch('q=kappa');

      expect(hits.map((hit) => hit.id).sort()).toEqual(
        [byName.id, byEmail.id, bySubject.id].sort(),
      );
      expect(hits.every((hit) => hit.type === 'contacts')).toBe(true);
      expect(hits[0].url).toBe(`/admin/contacts/${hits[0].id}`);
    });

    it('keeps staff accounts and customers in separate result types', async () => {
      const { dataSource } = context;
      const staffMember = await seedUser(dataSource, {
        role: Role.STAFF,
        fullName: 'Omega Nhân Viên',
      });
      const customer = await seedUser(dataSource, {
        role: Role.CUSTOMER,
        fullName: 'Omega Khách',
        phone: '+84911223344',
      });

      const { hits } = await adminSearch('q=omega');
      expect(hits.map((hit) => [hit.type, hit.id]).sort()).toEqual(
        [
          ['users', staffMember.id],
          ['customers', customer.id],
        ].sort(),
      );
      expect(hits.find((hit) => hit.type === 'customers')?.url).toBe(
        `/admin/customers/${customer.id}`,
      );
      expect(hits.find((hit) => hit.type === 'users')?.url).toBe(`/admin/users/${staffMember.id}`);

      const byPhone = await adminSearch('q=911223');
      expect(byPhone.hits.map((hit) => hit.id)).toEqual([customer.id]);
    });

    it('hides types the caller may not read', async () => {
      const { dataSource } = context;
      await seedUser(dataSource, { role: Role.STAFF, fullName: 'Sigma Nhân Viên' });
      await seedUser(dataSource, { role: Role.CUSTOMER, fullName: 'Sigma Khách' });
      await seedContact(dataSource, { fullName: 'Sigma Liên Hệ' });
      await seedPost(dataSource, { titles: { vi: 'Sigma bài viết', en: 'Sigma post' } });

      const admin = await adminSearch('q=sigma');
      const staff = await adminSearch('q=sigma', TEST_USERS.staff);

      expect(typesOf(admin.hits)).toEqual(['contacts', 'customers', 'posts', 'users']);
      expect(typesOf(staff.hits)).toEqual(['contacts', 'customers', 'posts']);
      expect(staff.meta.types).not.toContain('users');
    });

    it('silently ignores a requested type the caller may not read', async () => {
      await seedUser(context.dataSource, { role: Role.CUSTOMER, fullName: 'Tau Khách' });
      const staff = await adminSearch('q=tau&types=customers,users', TEST_USERS.staff);
      expect(typesOf(staff.hits)).toEqual(['customers']);
      expect(staff.meta.types).not.toContain('users');
      const owner = await adminSearch('q=tau&types=customers', TEST_USERS.owner);
      expect(owner.hits).toHaveLength(1);
    });

    it('restricts results to the requested types, comma separated or repeated', async () => {
      const { dataSource } = context;
      await seedPost(dataSource, { titles: { vi: 'Lambda bài', en: 'Lambda post' } });
      await seedProduct(dataSource, { names: { vi: 'Lambda sp', en: 'Lambda product' } });
      await seedProject(dataSource, { titles: { vi: 'Lambda dự án', en: 'Lambda project' } });

      const comma = await adminSearch('q=lambda&types=posts,products');
      const repeated = await adminSearch('q=lambda&types=posts&types=projects');

      expect(typesOf(comma.hits)).toEqual(['posts', 'products']);
      expect(typesOf(repeated.hits)).toEqual(['posts', 'projects']);
    });

    it('returns at most 5 results per type by default and honours the limit', async () => {
      for (let index = 0; index < 7; index += 1) {
        await seedPost(context.dataSource, {
          titles: { vi: `Mu bài ${index}`, en: `Mu post ${index}` },
        });
        await seedContact(context.dataSource, { fullName: `Mu liên hệ ${index}` });
      }

      const byDefault = await adminSearch('q=mu');
      const limited = await adminSearch('q=mu&limit=2');
      const widest = await adminSearch('q=mu&limit=10');

      expect(byDefault.meta.counts).toMatchObject({ posts: 5, contacts: 5 });
      expect(limited.meta.counts).toMatchObject({ posts: 2, contacts: 2 });
      expect(widest.meta.counts).toMatchObject({ posts: 7, contacts: 7 });
    });

    it('treats percent and underscore as literal characters', async () => {
      const { dataSource } = context;
      const literal = await seedPost(dataSource, {
        titles: { vi: 'Giảm 50% hôm nay', en: 'Save 50% today' },
      });
      await seedPost(dataSource, { titles: { vi: 'Giảm 500 hôm nay', en: 'Save 500 today' } });
      const underscore = await seedPost(dataSource, { titles: { vi: 'ma_so_1', en: 'code_1' } });
      await seedPost(dataSource, { titles: { vi: 'maxsox1', en: 'codex1' } });

      const percent = await adminSearch(`q=${encodeURIComponent('50%')}`);
      const lowDash = await adminSearch('q=ma_so');

      expect(percent.hits.map((hit) => hit.id)).toEqual([literal.id]);
      expect(lowDash.hits.map((hit) => hit.id)).toEqual([underscore.id]);
    });

    it('never returns soft-deleted rows', async () => {
      const { dataSource } = context;
      await seedPost(dataSource, { titles: { vi: 'Rho bài', en: 'Rho post' }, deleted: true });
      await seedContact(dataSource, { fullName: 'Rho liên hệ', deleted: true });
      await seedUser(dataSource, { fullName: 'Rho khách', deleted: true });
      await seedMedia(dataSource, { originalName: 'rho.png', deleted: true });
      await seedPage(dataSource, { path: '/rho', deleted: true });

      expect((await adminSearch('q=rho')).hits).toEqual([]);
    });
  });

  describe('public search', () => {
    it('needs no authentication and validates its input', async () => {
      await request(server()).get(`${publicUrl}?q=alpha`).expect(200);
      await request(server()).get(publicUrl).expect(400);
      await request(server()).get(`${publicUrl}?q=a`).expect(400);
      await request(server())
        .get(`${publicUrl}?q=${'a'.repeat(101)}`)
        .expect(400);
      await request(server()).get(`${publicUrl}?q=alpha&locale=fr`).expect(400);
    });

    it('returns published items with the documented shape', async () => {
      const { dataSource } = context;
      const post = await seedPost(dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Nền tảng Delta', en: 'Delta platform' },
        excerpts: { vi: 'Tóm tắt bài viết', en: 'Post summary' },
      });
      const product = await seedProduct(dataSource, {
        status: PublicationStatus.PUBLISHED,
        names: { vi: 'Delta sản phẩm', en: 'Delta product' },
        taglines: { vi: 'Khẩu hiệu', en: 'Tagline' },
      });
      const project = await seedProject(dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Delta dự án', en: 'Delta project' },
        summaries: { vi: 'Tóm tắt dự án', en: 'Project summary' },
      });
      const service = await seedService(dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Delta dịch vụ', en: 'Delta service' },
      });

      const vietnamese = await publicSearch('q=delta');
      const byType = Object.fromEntries(vietnamese.map((hit) => [hit.type, hit]));

      expect(byType.post).toEqual({
        type: 'post',
        title: 'Nền tảng Delta',
        excerpt: 'Tóm tắt bài viết',
        slug: post.slug,
        publicPath: `/bai-viet/${post.slug}`,
      });
      expect(byType.product).toMatchObject({
        title: 'Delta sản phẩm',
        excerpt: 'Khẩu hiệu',
        publicPath: `/san-pham/${product.slug}`,
      });
      expect(byType.project).toMatchObject({ publicPath: `/du-an/${project.slug}` });
      expect(byType.service).toMatchObject({ publicPath: `/dich-vu/${service.slug}`, excerpt: '' });

      const english = await publicSearch('q=delta&locale=en');
      expect(english.find((hit) => hit.type === 'post')?.title).toBe('Delta platform');
    });

    it('never returns drafts, reviews, archived, scheduled or deleted items', async () => {
      const { dataSource } = context;
      const visible = await seedPost(dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Epsilon công khai', en: 'Epsilon public' },
      });
      for (const status of [
        PublicationStatus.DRAFT,
        PublicationStatus.IN_REVIEW,
        PublicationStatus.ARCHIVED,
      ]) {
        await seedPost(dataSource, { status, titles: { vi: 'Epsilon ẩn', en: 'Epsilon hidden' } });
        await seedProduct(dataSource, {
          status,
          names: { vi: 'Epsilon ẩn', en: 'Epsilon hidden' },
        });
        await seedProject(dataSource, {
          status,
          titles: { vi: 'Epsilon ẩn', en: 'Epsilon hidden' },
        });
        await seedService(dataSource, {
          status,
          titles: { vi: 'Epsilon ẩn', en: 'Epsilon hidden' },
        });
      }
      await seedPost(dataSource, {
        status: PublicationStatus.PUBLISHED,
        publishedAt: daysFromNow(5),
        titles: { vi: 'Epsilon hẹn giờ', en: 'Epsilon scheduled' },
      });
      await seedPost(dataSource, {
        status: PublicationStatus.PUBLISHED,
        publishedAt: null,
        titles: { vi: 'Epsilon chưa đặt ngày', en: 'Epsilon undated' },
      });
      await seedProduct(dataSource, {
        status: PublicationStatus.PUBLISHED,
        publishedAt: daysFromNow(5),
        names: { vi: 'Epsilon hẹn giờ', en: 'Epsilon scheduled' },
      });
      await seedPost(dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Epsilon đã xoá', en: 'Epsilon removed' },
        deleted: true,
      });
      await seedProject(dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Epsilon đã xoá', en: 'Epsilon removed' },
        deleted: true,
      });

      const hits = await publicSearch('q=epsilon');

      expect(hits).toHaveLength(1);
      expect(hits[0].slug).toBe(visible.slug);
    });

    it('only searches the requested language', async () => {
      await seedPost(context.dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Bài tiếng Việt', en: 'Zebra article' },
      });
      expect(await publicSearch('q=zebra')).toEqual([]);
      expect(await publicSearch('q=zebra&locale=en')).toHaveLength(1);
    });

    it('matches the excerpt as well as the title', async () => {
      await seedPost(context.dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Tiêu đề', en: 'Title' },
        excerpts: { vi: 'Nói về chuyển đổi số', en: 'About digital change' },
      });
      expect(await publicSearch(`q=${encodeURIComponent('chuyển đổi')}`)).toHaveLength(1);
    });

    it('returns at most 8 items per type', async () => {
      for (let index = 0; index < 10; index += 1) {
        await seedPost(context.dataSource, {
          status: PublicationStatus.PUBLISHED,
          titles: { vi: `Theta bài ${index}`, en: `Theta post ${index}` },
        });
        await seedService(context.dataSource, {
          status: PublicationStatus.PUBLISHED,
          titles: { vi: `Theta dịch vụ ${index}`, en: `Theta service ${index}` },
        });
      }
      const hits = await publicSearch('q=theta');
      expect(hits.filter((hit) => hit.type === 'post')).toHaveLength(8);
      expect(hits.filter((hit) => hit.type === 'service')).toHaveLength(8);
    });

    it('treats percent as a literal character', async () => {
      const { dataSource } = context;
      await seedPost(dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Giảm 30% phí', en: 'Save 30% fees' },
      });
      await seedPost(dataSource, {
        status: PublicationStatus.PUBLISHED,
        titles: { vi: 'Giảm 300 phí', en: 'Save 300 fees' },
      });
      expect(await publicSearch(`q=${encodeURIComponent('30%')}`)).toHaveLength(1);
    });
  });
});
