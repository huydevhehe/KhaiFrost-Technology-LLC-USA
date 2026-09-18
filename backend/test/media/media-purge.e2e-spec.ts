import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Locale } from '../../src/common/enums/locale.enum';
import { storageConfig } from '../../src/config/storage.config';
import { MEDIA_TRASH_RETENTION_DAYS } from '../../src/modules/media/constants/media.constants';
import { MediaAssetTranslation } from '../../src/modules/media/entities/media-asset-translation.entity';
import { MediaAsset, MediaVariant } from '../../src/modules/media/entities/media-asset.entity';
import { MediaModule } from '../../src/modules/media/media.module';
import { MediaPurgeService } from '../../src/modules/media/services/media-purge.service';
import { LocalStorageProvider } from '../../src/modules/media/storage/local-storage.provider';
import {
  StorageProvider,
  STORAGE_PROVIDER,
} from '../../src/modules/media/storage/storage-provider.interface';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { TestArticle, TestArticleImage } from './support/test-entities';

const DAY = 24 * 60 * 60 * 1000;

class FakeStorageProvider implements StorageProvider {
  readonly deleted: string[] = [];
  failingKeys = new Set<string>();

  put(): Promise<void> {
    return Promise.resolve();
  }
  read(): Promise<Buffer> {
    return Promise.resolve(Buffer.alloc(0));
  }
  createReadStream(): never {
    throw new Error('not used');
  }
  delete(key: string): Promise<void> {
    if (this.failingKeys.has(key)) return Promise.reject(new Error('disk failure'));
    this.deleted.push(key);
    return Promise.resolve();
  }
  exists(): Promise<boolean> {
    return Promise.resolve(true);
  }
  toPublicUrl(key: string): string {
    return `https://cdn.test/${key}`;
  }
}

describe('MediaPurgeService', () => {
  let context: ModuleTestingContext;
  let fake: FakeStorageProvider;
  let purge: MediaPurgeService;
  let counter = 0;

  const assets = () => context.dataSource.getRepository(MediaAsset);

  beforeAll(async () => {
    fake = new FakeStorageProvider();
    context = await createModuleTestingContext({
      entities: [MediaAsset, MediaAssetTranslation, TestArticle, TestArticleImage],
      imports: [MediaModule],
      customize: (builder) => builder.overrideProvider(STORAGE_PROVIDER).useValue(fake),
    });
    purge = context.moduleRef.get(MediaPurgeService);
  });

  afterAll(async () => {
    await context.close();
  });

  beforeEach(() => {
    fake.deleted.length = 0;
    fake.failingKeys.clear();
  });

  async function createAsset(options: {
    deletedDaysAgo?: number;
    storageKey?: string;
    variantKeys?: string[];
  }): Promise<MediaAsset> {
    counter += 1;
    const key = options.storageKey ?? `2026/01/asset-${counter}.webp`;
    const variants: Record<string, MediaVariant> = {};
    (options.variantKeys ?? []).forEach((variantKey, index) => {
      variants[`v${index}`] = {
        storageKey: variantKey,
        width: 10,
        height: 10,
        sizeBytes: 1,
        mimeType: 'image/webp',
      };
    });
    const saved = await assets().save(
      assets().create({
        originalName: `asset-${counter}.jpg`,
        storageKey: key,
        mimeType: 'image/webp',
        sizeBytes: 10,
        checksumSha256: String(counter).padStart(64, '0'),
        variants,
      }),
    );
    if (options.deletedDaysAgo !== undefined) {
      await context.dataSource.query('UPDATE media_assets SET deleted_at = $1 WHERE id = $2', [
        new Date(Date.now() - options.deletedDaysAgo * DAY),
        saved.id,
      ]);
    }
    return saved;
  }

  it('uses a 30 day retention and registers a daily cron job', () => {
    expect(MEDIA_TRASH_RETENTION_DAYS).toBe(30);
    expect(
      Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', MediaPurgeService.prototype.runScheduled),
    ).toEqual(expect.objectContaining({ name: 'media-trash-purge' }));
  });

  it('purges only assets soft-deleted longer ago than the retention and deletes all their files', async () => {
    const expired = await createAsset({
      deletedDaysAgo: 31,
      storageKey: '2026/01/expired.webp',
      variantKeys: ['2026/01/expired_thumb.webp', '2026/01/expired_medium.webp'],
    });
    const recent = await createAsset({ deletedDaysAgo: 29, storageKey: '2026/01/recent.webp' });
    const active = await createAsset({ storageKey: '2026/01/active.webp' });
    // Old but never deleted: age alone must never make an asset eligible
    await assets().query(`UPDATE media_assets SET created_at = now() - interval '400 days'`);

    const summary = await purge.purgeExpired();

    expect(summary).toEqual({ purged: 1, skipped: 0, failed: 0 });
    expect(fake.deleted.sort()).toEqual([
      '2026/01/expired.webp',
      '2026/01/expired_medium.webp',
      '2026/01/expired_thumb.webp',
    ]);
    expect(await assets().findOne({ where: { id: expired.id }, withDeleted: true })).toBeNull();
    expect(await assets().findOne({ where: { id: recent.id }, withDeleted: true })).not.toBeNull();
    expect(await assets().findOne({ where: { id: active.id }, withDeleted: true })).not.toBeNull();
  });

  it('removes the translations of a purged asset', async () => {
    const asset = await createAsset({ deletedDaysAgo: 45 });
    const translations = context.dataSource.getRepository(MediaAssetTranslation);
    await translations.save(
      translations.create({
        mediaAssetId: asset.id,
        locale: Locale.VI,
        altText: 'x',
        caption: null,
      }),
    );

    await purge.purgeExpired();

    expect(await translations.count({ where: { mediaAssetId: asset.id } })).toBe(0);
  });

  it('is repeatable: a second run finds nothing left', async () => {
    for (let index = 0; index < 3; index += 1) await createAsset({ deletedDaysAgo: 60 });
    const first = await purge.purgeExpired();
    expect(first.purged).toBeGreaterThanOrEqual(3);
    expect(await purge.purgeExpired()).toEqual({ purged: 0, skipped: 0, failed: 0 });
  });

  it('keeps an asset that a soft-deleted row still references, without touching its files', async () => {
    const asset = await createAsset({ deletedDaysAgo: 90, storageKey: '2026/01/held.webp' });
    const articles = context.dataSource.getRepository(TestArticle);
    const article = await articles.save({ title: 'Archived', coverId: asset.id });
    await articles.softDelete({ id: article.id });

    const summary = await purge.purgeExpired();

    expect(summary).toEqual({ purged: 0, skipped: 1, failed: 0 });
    expect(fake.deleted).toEqual([]);
    expect(await assets().findOne({ where: { id: asset.id }, withDeleted: true })).not.toBeNull();

    // A skipped row must not block later ones in the same run
    const next = await createAsset({ deletedDaysAgo: 40, storageKey: '2026/01/after-held.webp' });
    expect(await purge.purgeExpired()).toEqual({ purged: 1, skipped: 1, failed: 0 });
    expect(await assets().findOne({ where: { id: next.id }, withDeleted: true })).toBeNull();
  });

  it('survives a storage failure: the row is gone, the failing file only logs', async () => {
    const asset = await createAsset({
      deletedDaysAgo: 50,
      storageKey: '2026/01/flaky.webp',
      variantKeys: ['2026/01/flaky_thumb.webp'],
    });
    fake.failingKeys.add('2026/01/flaky.webp');

    const summary = await purge.purgeExpired();

    expect(summary.purged).toBe(1);
    expect(fake.deleted).toEqual(['2026/01/flaky_thumb.webp']);
    expect(await assets().findOne({ where: { id: asset.id }, withDeleted: true })).toBeNull();
  });

  it('never deletes anything outside the upload root, even for a corrupted storage key', async () => {
    const config = context.moduleRef.get(storageConfig.KEY);
    const sandbox = mkdtempSync(join(tmpdir(), 'kf-purge-outside-'));
    const outsideFile = join(sandbox, 'precious.txt');
    writeFileSync(outsideFile, 'do not delete');
    mkdirSync(config.uploadDir, { recursive: true });

    const realProvider = new LocalStorageProvider(config);
    const realPurge = new MediaPurgeService(assets(), realProvider);
    const relativeToRoot = `../../${sandbox.split(/[\\/]/).pop()}/precious.txt`;
    const corrupted = await createAsset({
      deletedDaysAgo: 100,
      storageKey: relativeToRoot,
      variantKeys: [outsideFile, '/etc/hosts', '..\\..\\precious.txt'],
    });

    const summary = await realPurge.purgeExpired();

    expect(summary.purged).toBe(1);
    expect(existsSync(outsideFile)).toBe(true);
    expect(await assets().findOne({ where: { id: corrupted.id }, withDeleted: true })).toBeNull();
  });

  it('removes purged files from a real upload directory', async () => {
    const config = context.moduleRef.get(storageConfig.KEY);
    const realProvider = new LocalStorageProvider(config);
    const realPurge = new MediaPurgeService(assets(), realProvider);
    await realProvider.put('2026/02/gone.webp', Buffer.from('a'), 'image/webp');
    await realProvider.put('2026/02/kept.webp', Buffer.from('b'), 'image/webp');
    await createAsset({ deletedDaysAgo: 35, storageKey: '2026/02/gone.webp' });
    await createAsset({ deletedDaysAgo: 5, storageKey: '2026/02/kept.webp' });

    await realPurge.purgeExpired();

    expect(await realProvider.exists('2026/02/gone.webp')).toBe(false);
    expect(await realProvider.exists('2026/02/kept.webp')).toBe(true);
  });
});
