import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigType } from '@nestjs/config';
import request from 'supertest';
import { EntityTarget, ObjectLiteral } from 'typeorm';
import { PublicationStatus } from '../../src/common/enums/publication-status.enum';
import { Role } from '../../src/common/enums/role.enum';
import { storageConfig } from '../../src/config/storage.config';
import {
  POSTS,
  PRODUCT_CATEGORIES,
  PROJECT_CATEGORIES,
  SEEDER_NAMES,
} from '../../src/database/seeds/seed-content-mapping';
import {
  formatReport,
  resolveSeedOptions,
  runSeeds,
  SeedRunReport,
} from '../../src/database/seeds/seed-runner';
import { FrontendContentLoader } from '../../src/database/seeds/support/frontend-content.loader';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { ClientLocation } from '../../src/modules/client-locations/entities/client-location.entity';
import { NavigationMenu } from '../../src/modules/navigation/entities/navigation-menu.entity';
import { PageSectionMedia } from '../../src/modules/pages/entities/page-section-media.entity';
import { PageTranslation } from '../../src/modules/pages/entities/page-translation.entity';
import { Page } from '../../src/modules/pages/entities/page.entity';
import { PostCategory } from '../../src/modules/posts/entities/post-category.entity';
import { PostTranslation } from '../../src/modules/posts/entities/post-translation.entity';
import { Post } from '../../src/modules/posts/entities/post.entity';
import { ProductCategory } from '../../src/modules/products/entities/product-category.entity';
import { Product } from '../../src/modules/products/entities/product.entity';
import { ProjectCategory } from '../../src/modules/projects/entities/project-category.entity';
import { ProjectTranslation } from '../../src/modules/projects/entities/project-translation.entity';
import { Project } from '../../src/modules/projects/entities/project.entity';
import { ServiceCategoryProduct } from '../../src/modules/service-catalog/entities/service-category-product.entity';
import { ServiceCategoryTranslation } from '../../src/modules/service-catalog/entities/service-category-translation.entity';
import { ServiceCategory } from '../../src/modules/service-catalog/entities/service-category.entity';
import { SiteSetting } from '../../src/modules/settings/entities/site-setting.entity';
import { Testimonial } from '../../src/modules/testimonials/entities/testimonial.entity';
import { UiTranslation } from '../../src/modules/ui-translations/entities/ui-translation.entity';
import { flattenResourceBundle } from '../../src/modules/ui-translations/utils/resource-bundle';
import { User } from '../../src/modules/users/entities/user.entity';
import { ModuleTestingContext } from '../support/create-module-testing-context';
import { createImage } from '../media/support/image-fixtures';
import {
  createImageFixtures,
  createSeedTestContext,
  ImageFixtures,
  SEED_TEST_OWNER,
} from './support/seed-test-context';

const LOCALES = ['vi', 'en'] as const;
const PUBLIC = '/api/v1/public';

describe('content seeding (e2e)', () => {
  let context: ModuleTestingContext;
  let fixtures: ImageFixtures;
  let content: FrontendContentLoader;
  let firstRun: SeedRunReport;
  let secondRun: SeedRunReport;
  let countsAfterFirstRun: Record<string, number>;
  let countsBeforeAnything: Record<string, number>;
  let dryRunReport: SeedRunReport;
  const extraDirectories: string[] = [];

  const services = () => ({
    get: <T>(token: any): T => context.moduleRef.get(token, { strict: false }) as T,
  });
  const repository = <T extends ObjectLiteral>(entity: EntityTarget<T>) =>
    context.dataSource.getRepository(entity);
  const count = (entity: EntityTarget<ObjectLiteral>) =>
    repository(entity).count({ withDeleted: true });
  const options = () => ({
    imagesDirectory: fixtures.directory,
    bootstrapOwner: SEED_TEST_OWNER,
  });
  const server = () => context.app.getHttpServer();
  const rowsOf = (body: any): any[] => (Array.isArray(body.data) ? body.data : body.data.items);

  async function snapshotCounts(): Promise<Record<string, number>> {
    const entities: Record<string, EntityTarget<ObjectLiteral>> = {
      media: MediaAsset,
      users: User,
      uiTranslations: UiTranslation,
      settings: SiteSetting,
      menus: NavigationMenu,
      services: ServiceCategory,
      serviceProducts: ServiceCategoryProduct,
      projects: Project,
      projectCategories: ProjectCategory,
      testimonials: Testimonial,
      clientLocations: ClientLocation,
      posts: Post,
      postCategories: PostCategory,
      pages: Page,
      products: Product,
      productCategories: ProductCategory,
    };
    const counts: Record<string, number> = {};
    for (const [name, entity] of Object.entries(entities)) counts[name] = await count(entity);
    return counts;
  }

  beforeAll(async () => {
    jest.setTimeout(240_000);
    fixtures = await createImageFixtures();
    context = await createSeedTestContext();
    content = new FrontendContentLoader(resolveSeedOptions().frontendDirectory);
    countsBeforeAnything = await snapshotCounts();

    dryRunReport = await runSeeds(services(), { ...options(), dryRun: true });
    firstRun = await runSeeds(services(), options());
    countsAfterFirstRun = await snapshotCounts();
    secondRun = await runSeeds(services(), options());
    if (process.env.SEED_TEST_VERBOSE) {
      console.log(`${formatReport(dryRunReport)}

${formatReport(firstRun)}

${formatReport(secondRun)}`);
    }
  }, 240_000);

  afterAll(async () => {
    for (const directory of extraDirectories) {
      if (directory.startsWith(tmpdir())) rmSync(directory, { recursive: true, force: true });
    }
    fixtures.cleanup();
    await context.close();
  });

  describe('runner', () => {
    it('reports every seeder in the documented order', () => {
      expect(firstRun.seeders.map((seeder) => seeder.name)).toEqual([...SEEDER_NAMES]);
    });

    it('a dry run validates everything but writes nothing', () => {
      expect(dryRunReport.dryRun).toBe(true);
      expect(dryRunReport.failed).toBe(0);
      expect(
        dryRunReport.seeders.reduce((total, seeder) => total + seeder.created, 0),
      ).toBeGreaterThan(0);
      expect(countsBeforeAnything).toEqual(
        Object.fromEntries(Object.keys(countsBeforeAnything).map((key) => [key, 0])),
      );
    });

    it('the first run has no failures', () => {
      expect(formatReport(firstRun)).toContain('Done, no failures.');
      for (const seeder of firstRun.seeders) {
        expect({ name: seeder.name, errors: seeder.errors }).toEqual({
          name: seeder.name,
          errors: [],
        });
      }
    });

    it('rejects unknown seeder names', async () => {
      await expect(runSeeds(services(), { ...options(), only: ['nope'] })).rejects.toThrow(
        /Unknown seeder/,
      );
    });

    it('can run a single seeder that relies on data of earlier runs', async () => {
      const report = await runSeeds(services(), { ...options(), only: ['products'] });
      expect(report.seeders.map((seeder) => seeder.name)).toEqual(['products']);
      expect(report.seeders[0].created).toBe(0);
    });
  });

  describe('idempotency', () => {
    it('a second run creates nothing and fails nothing', () => {
      expect(secondRun.failed).toBe(0);
      for (const seeder of secondRun.seeders) {
        expect({ name: seeder.name, created: seeder.created }).toEqual({
          name: seeder.name,
          created: 0,
        });
      }
    });

    it('a second run leaves every row count unchanged', async () => {
      expect(await snapshotCounts()).toEqual(countsAfterFirstRun);
    });

    it('never overwrites content an administrator changed', async () => {
      const service = await repository(ServiceCategoryTranslation).findOneByOrFail({
        locale: 'vi' as any,
      });
      const project = await repository(ProjectTranslation).findOneByOrFail({ locale: 'vi' as any });
      await repository(ProjectTranslation).update(
        { id: project.id },
        { title: 'Edited by an admin' },
      );
      await repository(ServiceCategoryTranslation).update(
        { id: service.id },
        { title: 'Edited service' },
      );

      const report = await runSeeds(services(), options());
      expect(report.seeders.reduce((total, seeder) => total + seeder.created, 0)).toBe(0);
      expect((await repository(ProjectTranslation).findOneByOrFail({ id: project.id })).title).toBe(
        'Edited by an admin',
      );
      expect(
        (await repository(ServiceCategoryTranslation).findOneByOrFail({ id: service.id })).title,
      ).toBe('Edited service');
    });
  });

  describe('counts match the source files', () => {
    it('creates one row per source entry', () => {
      const services = content.services();
      const details = content.serviceCategoryDetails();
      expect(countsAfterFirstRun.services).toBe(services.length);
      expect(countsAfterFirstRun.serviceProducts).toBe(
        details.reduce((total, detail) => total + detail.products.length, 0),
      );
      expect(countsAfterFirstRun.projects).toBe(content.projects().length);
      expect(countsAfterFirstRun.projectCategories).toBe(PROJECT_CATEGORIES.length);
      expect(countsAfterFirstRun.testimonials).toBe(content.testimonials().length);
      expect(countsAfterFirstRun.clientLocations).toBe(content.clientLocations().length);
      expect(countsAfterFirstRun.posts).toBe(content.blogPosts().length);
      expect(countsAfterFirstRun.posts).toBe(POSTS.length);
      expect(countsAfterFirstRun.postCategories).toBe(content.adminBlogCategories().length);
      expect(countsAfterFirstRun.pages).toBe(5);
      expect(countsAfterFirstRun.menus).toBe(2);
      expect(countsAfterFirstRun.settings).toBe(6);
      expect(countsAfterFirstRun.users).toBe(1);
    });

    it('imports the ui translations of both languages', async () => {
      const keys = Object.keys(flattenResourceBundle(content.uiBundle('vi')));
      expect(Object.keys(flattenResourceBundle(content.uiBundle('en'))).length).toBe(keys.length);
      expect(countsAfterFirstRun.uiTranslations).toBe(keys.length);
      const missing = await repository(UiTranslation)
        .createQueryBuilder('t')
        .where("COALESCE(t.valueVi, '') = '' OR COALESCE(t.valueEn, '') = ''")
        .getCount();
      expect(missing).toBe(0);
      expect(await repository(UiTranslation).countBy({ isSystem: true })).toBe(keys.length);
    });

    it('imports every supported image and reports the unsupported ones', () => {
      expect(countsAfterFirstRun.media).toBe(fixtures.rasterCount);
      const media = firstRun.seeders.find((seeder) => seeder.name === 'media');
      expect(media?.created).toBe(fixtures.rasterCount);
      expect(media?.skipped).toBe(fixtures.unsupportedCount);
      expect(media?.notes.join(' ')).toContain('.svg');
    });

    it('creates the product categories but no products', async () => {
      expect(countsAfterFirstRun.products).toBe(0);
      expect(countsAfterFirstRun.productCategories).toBe(PRODUCT_CATEGORIES.length);
      const response = await request(server()).get(`${PUBLIC}/product-categories?locale=en`);
      expect(rowsOf(response.body).map((row) => row.name)).toEqual(
        PRODUCT_CATEGORIES.map((category) => category.en),
      );
    });
  });

  describe('published content has both languages', () => {
    it('services', async () => {
      const services = await repository(ServiceCategory).find();
      expect(services.every((service) => service.status === PublicationStatus.PUBLISHED)).toBe(
        true,
      );
      for (const service of services) {
        const translations = await repository(ServiceCategoryTranslation).findBy({
          categoryId: service.id,
        });
        expect(translations.map((row) => row.locale).sort()).toEqual(['en', 'vi']);
        for (const row of translations) {
          expect(row.title.trim()).not.toBe('');
          expect(row.summary.trim()).not.toBe('');
          expect(row.heroTitle.trim()).not.toBe('');
        }
      }
    });

    it('projects', async () => {
      const projects = await repository(Project).find();
      expect(projects.every((project) => project.status === PublicationStatus.PUBLISHED)).toBe(
        true,
      );
      for (const project of projects) {
        const translations = await repository(ProjectTranslation).findBy({ projectId: project.id });
        expect(translations.map((row) => row.locale).sort()).toEqual(['en', 'vi']);
        expect(translations.every((row) => row.title.trim() && row.summary.trim())).toBe(true);
        expect(project.categoryId).not.toBeNull();
      }
    });

    it('posts', async () => {
      const posts = await repository(Post).find();
      expect(posts.every((post) => post.status === PublicationStatus.PUBLISHED)).toBe(true);
      for (const post of posts) {
        const translations = await repository(PostTranslation).findBy({ postId: post.id });
        expect(translations.map((row) => row.locale).sort()).toEqual(['en', 'vi']);
        expect(
          translations.every((row) => row.title && row.excerpt && row.contentHtml.includes('<p>')),
        ).toBe(true);
      }
      const dates = posts.map((post) => post.publishedAt?.toISOString().slice(0, 10)).sort();
      expect(dates).toEqual(['2025-08-05', '2025-08-12', '2025-08-18', '2025-08-29']);
    });

    it('pages', async () => {
      const pages = await repository(Page).find({ order: { path: 'ASC' } });
      expect(pages.map((page) => page.path)).toEqual([
        '/',
        '/dich-vu',
        '/du-an',
        '/lien-he',
        '/ve-chung-toi',
      ]);
      expect(pages.every((page) => page.status === 'published' && page.isSystem)).toBe(true);
      for (const page of pages) {
        const translations = await repository(PageTranslation).findBy({ pageId: page.id });
        expect(translations.map((row) => row.locale).sort()).toEqual(['en', 'vi']);
        expect(translations.every((row) => row.title && row.seoTitle && row.seoDescription)).toBe(
          true,
        );
      }
    });

    it('testimonials and client locations', async () => {
      for (const locale of LOCALES) {
        const testimonials = await request(server()).get(`${PUBLIC}/testimonials?locale=${locale}`);
        expect(rowsOf(testimonials.body)).toHaveLength(content.testimonials().length);
        expect(rowsOf(testimonials.body).every((row) => row.quote.length > 0)).toBe(true);
        const clients = await request(server()).get(`${PUBLIC}/client-locations?locale=${locale}`);
        expect(rowsOf(clients.body)).toHaveLength(content.clientLocations().length);
        expect(rowsOf(clients.body).every((row) => row.quote && row.role && row.country)).toBe(
          true,
        );
      }
    });
  });

  describe('media references', () => {
    it('resolves the /images/... references of every entity to media ids', async () => {
      expect(await repository(ServiceCategory).countBy({})).toBeGreaterThan(0);
      const services = await repository(ServiceCategory).find();
      expect(services.every((service) => service.coverImageId && service.heroImageId)).toBe(true);
      const projects = await repository(Project).find();
      expect(projects.every((project) => project.thumbnailId)).toBe(true);
      const testimonials = await repository(Testimonial).find();
      expect(testimonials.every((row) => row.avatarId)).toBe(true);
      const clients = await repository(ClientLocation).find();
      expect(clients.every((row) => row.avatarId && row.coverImageId)).toBe(true);
      const posts = await repository(Post).find();
      expect(posts.every((post) => post.coverImageId)).toBe(true);
      expect(await repository(PageSectionMedia).count()).toBeGreaterThan(10);

      const contact = await request(server()).get(`${PUBLIC}/settings?locale=en`);
      const offices = contact.body.data.contact.offices;
      expect(offices).toHaveLength(2);
      expect(offices.every((office: any) => office.image)).toBe(true);
      expect(contact.body.data.seoDefaults.defaultOgImage).toBeTruthy();
    });

    it('reports no missing media', () => {
      for (const seeder of firstRun.seeders) {
        expect(seeder.notes.filter((note) => note.startsWith('Media not found'))).toEqual([]);
      }
    });

    it('skips files that are unsupported or too large and still imports the others', async () => {
      const directory = mkdtempSync(join(tmpdir(), 'khaifrost-seed-extra-'));
      extraDirectories.push(directory);
      mkdirSync(join(directory, 'extra'));
      writeFileSync(
        join(directory, 'extra', 'unreferenced-photo.png'),
        await createImage({ format: 'png' }),
      );
      writeFileSync(
        join(directory, 'extra', 'vector.svg'),
        '<svg xmlns="http://www.w3.org/2000/svg"/>',
      );
      const maxBytes = context.moduleRef.get<ConfigType<typeof storageConfig>>(storageConfig.KEY, {
        strict: false,
      }).maxFileSizeBytes;
      writeFileSync(join(directory, 'extra', 'huge.png'), Buffer.alloc(maxBytes + 1));

      const report = await runSeeds(services(), {
        ...options(),
        imagesDirectory: directory,
        only: ['media'],
      });
      const media = report.seeders[0];
      expect(media.created).toBe(1);
      expect(media.skipped).toBe(2);
      expect(media.failed).toBe(0);
      expect(media.notes.join(' ')).toContain('huge.png');
      const asset = await repository(MediaAsset).findOneByOrFail({
        originalName: 'unreferenced-photo.png',
      });
      expect(asset.folder).toBe('extra');
    });
  });

  describe('public endpoints answer in both languages', () => {
    it('services', async () => {
      const titles: Record<string, string[]> = {};
      for (const locale of LOCALES) {
        const list = await request(server()).get(`${PUBLIC}/services?locale=${locale}`);
        expect(list.status).toBe(200);
        expect(rowsOf(list.body)).toHaveLength(content.services().length);
        titles[locale] = rowsOf(list.body).map((row) => row.title);

        const detail = await request(server()).get(
          `${PUBLIC}/services/ai-automation?locale=${locale}`,
        );
        expect(detail.status).toBe(200);
        expect(detail.body.data.products).toHaveLength(6);
        expect(detail.body.data.faq.length).toBeGreaterThan(0);
        expect(detail.body.data.partnerBanner).toBeTruthy();

        const overview = await request(server()).get(
          `${PUBLIC}/services/overview?locale=${locale}`,
        );
        expect(overview.status).toBe(200);
        expect(overview.body.data.stats).toHaveLength(content.servicesOverviewStats().length);
        expect(overview.body.data.processSteps).toHaveLength(
          content.servicesOverviewProcessSteps().length,
        );
        expect(overview.body.data.highlights).toHaveLength(content.whyUsItems().length);
      }
      expect(titles.vi).toContain('Quản lý hạ tầng & An ninh mạng');
      expect(titles.en).toContain('Managed Infrastructure & Cybersecurity');
    });

    it('projects', async () => {
      for (const locale of LOCALES) {
        const list = await request(server()).get(`${PUBLIC}/projects?locale=${locale}`);
        expect(list.status).toBe(200);
        expect(rowsOf(list.body)).toHaveLength(content.projects().length);
        const categories = await request(server()).get(
          `${PUBLIC}/projects/categories?locale=${locale}`,
        );
        expect(rowsOf(categories.body).map((row) => row.name)).toContain(
          locale === 'vi' ? 'Vận hành an ninh mạng' : 'Security Operations',
        );
      }
    });

    it('posts', async () => {
      for (const locale of LOCALES) {
        const list = await request(server()).get(`${PUBLIC}/posts?locale=${locale}`);
        expect(list.status).toBe(200);
        expect(rowsOf(list.body)).toHaveLength(content.blogPosts().length);
        const detail = await request(server()).get(
          `${PUBLIC}/posts/${POSTS[0].slug}?locale=${locale}`,
        );
        expect(detail.status).toBe(200);
        expect(detail.body.data.contentHtml).toContain('<p>');
      }
    });

    it('pages', async () => {
      for (const locale of LOCALES) {
        for (const path of ['/', '/dich-vu', '/du-an', '/ve-chung-toi', '/lien-he']) {
          const response = await request(server())
            .get(`${PUBLIC}/pages/by-path`)
            .query({ path, locale });
          expect(response.status).toBe(200);
          expect(response.body.data.sections.length).toBeGreaterThan(2);
        }
      }
      const home = await request(server())
        .get(`${PUBLIC}/pages/by-path`)
        .query({ path: '/', locale: 'en' });
      const hero = home.body.data.sections.find((section: any) => section.type === 'hero');
      expect(hero.content.headline ?? hero.headline).toBe('Build Smarter with KhaiFrost.');
    });

    it('navigation, settings and ui translations', async () => {
      for (const locale of LOCALES) {
        const header = await request(server()).get(`${PUBLIC}/navigation/header?locale=${locale}`);
        expect(header.body.data.items.map((item: any) => item.href)).toEqual(
          content.navLinks().map((link) => link.href),
        );
        expect(header.body.data.items[0].label).toBe(locale === 'vi' ? 'Trang chủ' : 'Home');
        const footer = await request(server()).get(`${PUBLIC}/navigation/footer?locale=${locale}`);
        expect(footer.body.data.items).toHaveLength(3);

        const settings = await request(server()).get(`${PUBLIC}/settings?locale=${locale}`);
        expect(settings.body.data.company.companyName).toBe('KhaiFrost Technology LLC');
        expect(settings.body.data.localization.enabledLocales).toEqual(['vi', 'en']);
        expect(settings.body.data.contact.channels).toHaveLength(2);

        const bundle = await request(server()).get(`${PUBLIC}/ui-translations/${locale}`);
        expect(bundle.status).toBe(200);
        expect(JSON.stringify(bundle.body)).toContain(
          locale === 'vi' ? 'Xây dựng thông minh' : 'Build Smarter',
        );
      }
    });

    it('lists the seeded owner as the only account', async () => {
      const owner = await repository(User).findOneByOrFail({ role: Role.OWNER });
      expect(owner.email).toBe(SEED_TEST_OWNER.email);
      expect(owner.mustChangePassword).toBe(true);
    });
  });
});
