import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { SiteSettingMedia } from '../../src/modules/settings/entities/site-setting-media.entity';
import { SiteSetting } from '../../src/modules/settings/entities/site-setting.entity';
import { SettingsModule } from '../../src/modules/settings/settings.module';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asTestUser } from '../support/test-authentication.guard';

const ADMIN = asTestUser({ id: '00000000-0000-4000-8000-000000000003', role: Role.ADMIN });
const STAFF = asTestUser({ id: '00000000-0000-4000-8000-000000000002', role: Role.STAFF });
const CUSTOMER = asTestUser({ id: '00000000-0000-4000-8000-000000000001', role: Role.CUSTOMER });

describe('settings (e2e)', () => {
  let context: ModuleTestingContext;
  let logo: MediaAsset;
  const server = () => context.app.getHttpServer();
  const admin = '/api/v1/admin/settings';
  const publicUrl = '/api/v1/public/settings';

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, SiteSetting, SiteSettingMedia],
      imports: [SettingsModule],
    });
    const media = context.dataSource.getRepository(MediaAsset);
    logo = await media.save(
      media.create({
        originalName: 'logo.png',
        storageKey: 'settings/logo.png',
        mimeType: 'image/png',
        sizeBytes: 10,
        width: 100,
        height: 50,
        checksumSha256: 'a'.repeat(64),
        folder: null,
        variants: {},
      }),
    );
  });

  afterAll(async () => {
    await context.close();
  });

  const put = (group: string, body: Record<string, unknown>, user = ADMIN) =>
    request(server()).put(`${admin}/${group}`).set(user).send(body);

  it('applies the permission matrix', async () => {
    await request(server()).get(admin).expect(401);
    await request(server()).get(admin).set(CUSTOMER).expect(403);
    await request(server()).get(admin).set(STAFF).expect(200);
    await request(server()).get(`${admin}/company`).set(STAFF).expect(200);
    await put('company', { version: 0, value: {} }, STAFF).then((r) => expect(r.status).toBe(403));
    await request(server()).get(admin).set(ADMIN).expect(200);
  });

  it('serves defaults on a fresh database and rejects unknown groups', async () => {
    const all = await request(server()).get(admin).set(ADMIN).expect(200);
    expect(all.body.data.map((row: { group: string }) => row.group)).toEqual([
      'company',
      'branding',
      'social',
      'contact',
      'localization',
      'seo-defaults',
    ]);
    expect(all.body.data.every((row: { isDefault: boolean }) => row.isDefault)).toBe(true);
    const publicSettings = await request(server()).get(publicUrl).expect(200);
    expect(publicSettings.body.data.company.companyName).toBe('KhaiFrost Technology LLC');
    expect(publicSettings.body.data.localization.enabledLocales).toEqual(['vi', 'en']);
    await request(server()).get(`${admin}/secrets`).set(ADMIN).expect(400);
  });

  it('validates each group and rejects unknown fields', async () => {
    const company = {
      companyName: 'KhaiFrost',
      email: 'not-an-email',
      phone: '+1 (713) 555-0100',
      address: { vi: 'Dia chi', en: 'Address' },
      website: 'javascript:alert(1)',
    };
    const bad = await put('company', { version: 0, value: company });
    expect(bad.status).toBe(400);
    const fields = bad.body.error.details.map((detail: { field: string }) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'website']));

    const unknown = await put('company', {
      version: 0,
      value: { ...company, email: 'a@b.co', website: 'https://a.co', smtpPassword: 'x' },
    });
    expect(unknown.status).toBe(400);

    expect(
      (await put('social', { version: 0, value: { links: [{ network: 'X', url: 'ftp://x' }] } }))
        .status,
    ).toBe(400);
    expect(
      (
        await put('localization', {
          version: 0,
          value: { defaultLocale: 'vi', enabledLocales: ['en'] },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await put('seo-defaults', {
          version: 0,
          value: { siteName: 'A', titleTemplate: 'no marker' },
        })
      ).status,
    ).toBe(400);
    expect(
      (await put('branding', { version: 0, value: { logoId: 'nope', brandColor: 'red' } })).status,
    ).toBe(400);
    expect(
      (
        await put('contact', {
          version: 0,
          value: {
            channels: [],
            offices: [
              {
                id: 'a',
                label: { vi: 'a', en: 'a' },
                street: 's',
                city: 'c',
                country: 'x',
                countryCode: 'US',
              },
              {
                id: 'a',
                label: { vi: 'a', en: 'a' },
                street: 's',
                city: 'c',
                country: 'x',
                countryCode: 'US',
              },
            ],
          },
        })
      ).status,
    ).toBe(400);
  });

  it('saves a group, enforces optimistic locking and keeps media protected', async () => {
    const first = await put('branding', {
      version: 0,
      value: { logoId: logo.id, brandColor: '#112233' },
    });
    expect(first.status).toBe(200);
    expect(first.body.data.version).toBe(1);
    expect(first.body.data.isDefault).toBe(false);
    expect(first.body.data.mediaUrls[logo.id]).toMatch(/settings\/logo\.png$/);

    const stale = await put('branding', { version: 0, value: { brandColor: '#000000' } });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');

    const links = await context.dataSource.getRepository(SiteSettingMedia).find();
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ mediaAssetId: logo.id, fieldKey: 'logoId' });
    await expect(
      context.dataSource.getRepository(MediaAsset).delete({ id: logo.id }),
    ).rejects.toThrow();

    const missing = await put('branding', {
      version: 1,
      value: { logoId: '00000000-0000-4000-8000-00000000ffff' },
    });
    expect(missing.status).toBe(400);

    const cleared = await put('branding', { version: 1, value: { brandColor: '#000000' } });
    expect(cleared.status).toBe(200);
    expect(await context.dataSource.getRepository(SiteSettingMedia).count()).toBe(0);
  });

  it('returns only public groups, flattened to the locale with media urls', async () => {
    await put('company', {
      version: 0,
      value: {
        companyName: 'KhaiFrost',
        email: 'hello@khaifrost.com',
        phone: '+84 96 123 4567',
        address: { vi: 'Quan 9', en: 'District 9' },
        website: 'https://khaifrost.vn',
      },
    }).then((r) => expect(r.status).toBe(200));
    await put('branding', { version: 2, value: { logoId: logo.id } }).then((r) =>
      expect(r.status).toBe(200),
    );
    await put('seo-defaults', {
      version: 0,
      value: {
        siteName: 'KF',
        titleTemplate: '%s | KF',
        defaultDescription: { vi: 'Mo ta', en: 'Desc' },
      },
      isPublic: false,
    }).then((r) => expect(r.status).toBe(200));

    const en = await request(server()).get(`${publicUrl}?locale=en`).expect(200);
    expect(en.body.data.company.address).toBe('District 9');
    expect(en.body.data.branding.logo).toMatch(/settings\/logo\.png$/);
    expect(en.body.data.branding.logoId).toBeUndefined();
    expect(en.body.data.branding.favicon).toBeNull();
    expect(en.body.data.seoDefaults).toBeUndefined();

    const vi = await request(server()).get(publicUrl).expect(200);
    expect(vi.body.data.company.address).toBe('Quan 9');
    await request(server()).get(`${publicUrl}?locale=fr`).expect(400);
  });
});
