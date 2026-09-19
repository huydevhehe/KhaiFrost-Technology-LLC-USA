import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { NavigationItemTranslation } from '../../src/modules/navigation/entities/navigation-item-translation.entity';
import { NavigationItem } from '../../src/modules/navigation/entities/navigation-item.entity';
import { NavigationMenu } from '../../src/modules/navigation/entities/navigation-menu.entity';
import { NavigationModule } from '../../src/modules/navigation/navigation.module';
import { PageStatus } from '../../src/modules/pages/constants/page-status';
import { Page } from '../../src/modules/pages/entities/page.entity';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asTestUser } from '../support/test-authentication.guard';

const ADMIN = asTestUser({ id: '00000000-0000-4000-8000-000000000003', role: Role.ADMIN });
const STAFF = asTestUser({ id: '00000000-0000-4000-8000-000000000002', role: Role.STAFF });
const CUSTOMER = asTestUser({ id: '00000000-0000-4000-8000-000000000001', role: Role.CUSTOMER });

const labels = (vi: string, en: string) => ({ vi: { label: vi }, en: { label: en } });

describe('navigation (e2e)', () => {
  let context: ModuleTestingContext;
  let publishedPage: Page;
  let draftPage: Page;
  const server = () => context.app.getHttpServer();
  const admin = '/api/v1/admin/navigation';
  const publicBase = '/api/v1/public/navigation';

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [Page, NavigationMenu, NavigationItem, NavigationItemTranslation],
      imports: [NavigationModule],
    });
    const pages = context.dataSource.getRepository(Page);
    publishedPage = await pages.save(
      pages.create({
        path: '/ve-chung-toi',
        templateKey: 'about',
        status: PageStatus.PUBLISHED,
        isSystem: false,
        publishedAt: new Date(),
        currentRevisionNumber: 1,
      }),
    );
    draftPage = await pages.save(
      pages.create({
        path: '/nhap',
        templateKey: 'generic',
        status: PageStatus.DRAFT,
        isSystem: false,
        publishedAt: null,
        currentRevisionNumber: 0,
      }),
    );
  });

  afterAll(async () => {
    await context.close();
  });

  const put = (key: string, body: Record<string, unknown>, user = ADMIN) =>
    request(server()).put(`${admin}/${key}`).set(user).send(body);

  it('applies the permission matrix (staff cannot manage navigation)', async () => {
    await request(server()).get(`${admin}/header`).expect(401);
    await request(server()).get(`${admin}/header`).set(CUSTOMER).expect(403);
    await request(server()).get(`${admin}/header`).set(STAFF).expect(403);
    await put('header', { version: 0, items: [] }, STAFF).then((r) => expect(r.status).toBe(403));
    await request(server()).get(`${admin}/header`).set(ADMIN).expect(200);
  });

  it('returns an empty tree for a menu that was never saved and 404 publicly', async () => {
    const menu = await request(server()).get(`${admin}/never-saved`).set(ADMIN).expect(200);
    expect(menu.body.data).toEqual({ key: 'never-saved', version: 0, items: [] });
    await request(server()).get(`${publicBase}/never-saved`).expect(404);
    await request(server()).get(`${admin}/Bad_Key`).set(ADMIN).expect(400);
  });

  it('saves a tree, keeps ids stable and bumps the version', async () => {
    const created = await put('header', {
      version: 0,
      items: [
        { linkType: 'path', url: '/', translations: labels('Trang chu', 'Home') },
        {
          linkType: 'none',
          translations: labels('Cong ty', 'Company'),
          children: [
            {
              linkType: 'page',
              pageId: publishedPage.id,
              translations: labels('Ve chung toi', 'About'),
            },
            {
              linkType: 'external',
              url: 'https://example.com/x',
              openInNewTab: true,
              translations: labels('Ngoai', 'Outside'),
            },
          ],
        },
      ],
    });
    expect(created.status).toBe(200);
    expect(created.body.data.version).toBeGreaterThanOrEqual(1);
    const [home, group] = created.body.data.items;
    expect(home.url).toBe('/');
    expect(group.children).toHaveLength(2);
    expect(group.children[0].pagePath).toBe('/ve-chung-toi');
    expect(group.children[1].openInNewTab).toBe(true);

    const version = created.body.data.version;
    const replaced = await put('header', {
      version,
      items: [
        {
          id: group.id,
          linkType: 'none',
          translations: labels('Cong ty', 'Company'),
          children: [],
        },
        { id: home.id, linkType: 'path', url: '/', translations: labels('Trang chu', 'Home') },
      ],
    });
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.version).toBeGreaterThan(version);
    expect(replaced.body.data.items.map((item: { id: string }) => item.id)).toEqual([
      group.id,
      home.id,
    ]);

    const stale = await put('header', { version, items: [] });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    expect(await context.dataSource.getRepository(NavigationItem).count()).toBe(2);
  });

  it('rejects invalid trees without changing the stored menu', async () => {
    const before = (await request(server()).get(`${admin}/header`).set(ADMIN)).body.data;
    const leaf = (extra: Record<string, unknown> = {}) => ({
      linkType: 'path',
      url: '/x',
      translations: labels('a', 'a'),
      ...extra,
    });
    const tooDeep = leaf({ children: [leaf({ children: [leaf({ children: [leaf()] })] })] });
    const cases: Record<string, unknown>[] = [
      { items: [tooDeep] },
      { items: [leaf({ linkType: 'external', url: 'javascript:alert(1)' })] },
      { items: [leaf({ linkType: 'external', url: 'ftp://example.com' })] },
      { items: [leaf({ url: '//evil.com' })] },
      { items: [leaf({ linkType: 'page', url: null })] },
      { items: [leaf({ linkType: 'page', pageId: '00000000-0000-4000-8000-00000000ffff' })] },
      { items: [leaf({ translations: { vi: { label: 'only vi' } } })] },
      { items: [leaf({ translations: labels('', 'x') })] },
      {
        items: [
          leaf({
            id: '11111111-1111-4111-8111-111111111111',
            children: [leaf({ id: '11111111-1111-4111-8111-111111111111' })],
          }),
        ],
      },
      { items: [leaf({ unknown: 1 })] },
    ];
    const statuses: number[] = [];
    for (const body of cases) {
      const response = await put('header', { version: before.version, ...body });
      statuses.push(response.status);
    }
    expect(statuses).toEqual(cases.map(() => 400));
    const after = (await request(server()).get(`${admin}/header`).set(ADMIN)).body.data;
    expect(after).toEqual(before);
  });

  it('serves a resolved public tree per locale and hides unpublished or invisible items', async () => {
    const current = (await request(server()).get(`${admin}/footer`).set(ADMIN)).body.data;
    const saved = await put('footer', {
      version: current.version,
      items: [
        { linkType: 'page', pageId: publishedPage.id, translations: labels('Gioi thieu', 'About') },
        { linkType: 'page', pageId: draftPage.id, translations: labels('Nhap', 'Draft') },
        {
          linkType: 'path',
          url: '/lien-he',
          isVisible: false,
          translations: labels('An', 'Hidden'),
        },
        { linkType: 'none', translations: labels('Trong', 'Empty group') },
        {
          linkType: 'none',
          translations: labels('Nhom', 'Group'),
          children: [
            {
              linkType: 'external',
              url: 'https://example.com',
              openInNewTab: true,
              translations: labels('Ben ngoai', 'External'),
            },
            { linkType: 'page', pageId: draftPage.id, translations: labels('Nhap 2', 'Draft 2') },
          ],
        },
      ],
    });
    expect(saved.status).toBe(200);

    const vi = await request(server()).get(`${publicBase}/footer`).expect(200);
    expect(vi.body.data.items.map((item: { label: string }) => item.label)).toEqual([
      'Gioi thieu',
      'Nhom',
    ]);
    expect(vi.body.data.items[0].href).toBe('/ve-chung-toi');
    const en = await request(server()).get(`${publicBase}/footer?locale=en`).expect(200);
    expect(en.body.data.items[1].children).toEqual([
      expect.objectContaining({
        label: 'External',
        href: 'https://example.com',
        openInNewTab: true,
        children: [],
      }),
    ]);

    await context.dataSource
      .getRepository(Page)
      .update({ id: draftPage.id }, { status: PageStatus.PUBLISHED });
    const after = await request(server()).get(`${publicBase}/footer?locale=en`).expect(200);
    expect(after.body.data.items.map((item: { label: string }) => item.label)).toEqual([
      'About',
      'Draft',
      'Group',
    ]);
    await context.dataSource
      .getRepository(Page)
      .update({ id: draftPage.id }, { status: PageStatus.DRAFT });
  });
});
