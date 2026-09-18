import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { RequestContextService } from '../src/common/context/request-context.service';
import { MediaAsset } from '../src/modules/media/entities/media-asset.entity';
import { MediaReferenceService } from '../src/modules/media/services/media-reference.service';
import { createTestingApp, TestingApp } from './support';

describe('Foundation (e2e)', () => {
  let testing: TestingApp;

  beforeAll(async () => {
    testing = await createTestingApp();
  });

  afterAll(async () => {
    await testing.close();
  });

  it('fills audit columns from the request context and resolves media references', async () => {
    const dataSource = testing.app.get(DataSource);
    const context = testing.app.get(RequestContextService);
    const media = testing.app.get(MediaReferenceService);
    const userId = randomUUID();

    const asset = await context.runAs(userId, () =>
      dataSource.getRepository(MediaAsset).save(
        dataSource.getRepository(MediaAsset).create({
          originalName: 'a b.png',
          storageKey: `2026/09/${randomUUID()}.png`,
          mimeType: 'image/png',
          sizeBytes: 123,
          checksumSha256: 'a'.repeat(64),
          variants: {},
        }),
      ),
    );

    expect(asset.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(asset.createdById).toBe(userId);
    expect(asset.updatedById).toBe(userId);

    await expect(media.assertAllExist([asset.id])).resolves.toBeUndefined();
    await expect(
      media.assertAllExist([asset.id, randomUUID(), 'not-a-uuid']),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
    const urls = await media.resolveUrls([asset.id]);
    expect(urls.get(asset.id)).toMatch(/.png$/);
  });
});
