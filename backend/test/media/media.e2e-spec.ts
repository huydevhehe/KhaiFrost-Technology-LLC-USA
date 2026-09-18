import { existsSync } from 'node:fs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import { Role } from '../../src/common/enums/role.enum';
import { storageConfig } from '../../src/config/storage.config';
import { MediaAssetTranslation } from '../../src/modules/media/entities/media-asset-translation.entity';
import { MediaAsset } from '../../src/modules/media/entities/media-asset.entity';
import { MediaModule } from '../../src/modules/media/media.module';
import { MediaReferenceService } from '../../src/modules/media/services/media-reference.service';
import { MediaService } from '../../src/modules/media/services/media.service';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { asTestUser } from '../support/test-authentication.guard';
import { createAnimatedGif, createImage, createPdf } from './support/image-fixtures';
import { TestArticle, TestArticleImage } from './support/test-entities';

const STAFF_ID = '00000000-0000-4000-8000-0000000000a1';
const ADMIN_ID = '00000000-0000-4000-8000-0000000000a2';
const OWNER_ID = '00000000-0000-4000-8000-0000000000a3';
const CUSTOMER_ID = '00000000-0000-4000-8000-0000000000a4';
const UNKNOWN_ID = '00000000-0000-4000-8000-00000000ffff';

const staff = asTestUser({ id: STAFF_ID, role: Role.STAFF });
const admin = asTestUser({ id: ADMIN_ID, role: Role.ADMIN });
const owner = asTestUser({ id: OWNER_ID, role: Role.OWNER });
const customer = asTestUser({ id: CUSTOMER_ID, role: Role.CUSTOMER });

interface UploadResultBody {
  originalName: string;
  status: 'created' | 'duplicate' | 'rejected';
  asset?: { id: string; url: string; thumbnailUrl: string; [key: string]: any };
  error?: { code: string; message: string };
}

describe('Media admin API', () => {
  let context: ModuleTestingContext;
  let uploadDir: string;

  const server = () => context.app.getHttpServer();
  const mediaRows = () => context.dataSource.getRepository(MediaAsset);

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [MediaAsset, MediaAssetTranslation, TestArticle, TestArticleImage],
      imports: [MediaModule],
    });
    uploadDir = context.moduleRef.get(storageConfig.KEY).uploadDir;
  });

  afterAll(async () => {
    await context.close();
  });

  async function upload(
    files: { buffer: Buffer; name: string; type?: string }[],
    user: Record<string, string> = admin,
    fields: Record<string, string> = {},
  ) {
    let call = request(server()).post('/api/v1/admin/media').set(user);
    for (const [name, value] of Object.entries(fields)) call = call.field(name, value);
    for (const file of files) {
      call = call.attach('files', file.buffer, {
        filename: file.name,
        contentType: file.type ?? 'application/octet-stream',
      });
    }
    return call;
  }

  async function uploadOne(
    buffer: Buffer,
    name = 'photo.jpg',
    user: Record<string, string> = admin,
    fields: Record<string, string> = {},
  ): Promise<UploadResultBody> {
    const response = await upload([{ buffer, name, type: 'image/jpeg' }], user, fields);
    expect(response.status).toBe(201);
    return response.body.data.results[0] as UploadResultBody;
  }

  describe('permissions', () => {
    let assetId: string;

    beforeAll(async () => {
      assetId = (await uploadOne(await createImage(), 'permissions.jpg')).asset!.id;
    });

    it('rejects anonymous requests with 401 on every endpoint', async () => {
      await request(server()).get('/api/v1/admin/media').expect(401);
      await request(server()).get(`/api/v1/admin/media/${assetId}`).expect(401);
      await request(server()).post('/api/v1/admin/media').expect(401);
      await request(server()).patch(`/api/v1/admin/media/${assetId}`).send({}).expect(401);
      await request(server()).delete(`/api/v1/admin/media/${assetId}`).expect(401);
    });

    it('rejects customers with 403 on every endpoint', async () => {
      await request(server()).get('/api/v1/admin/media').set(customer).expect(403);
      await request(server()).get(`/api/v1/admin/media/${assetId}`).set(customer).expect(403);
      await request(server()).post('/api/v1/admin/media').set(customer).expect(403);
      await request(server())
        .patch(`/api/v1/admin/media/${assetId}`)
        .set(customer)
        .send({})
        .expect(403);
      await request(server()).delete(`/api/v1/admin/media/${assetId}`).set(customer).expect(403);
    });

    it('lets staff read, upload and edit but never delete', async () => {
      await request(server()).get('/api/v1/admin/media').set(staff).expect(200);
      await request(server()).get(`/api/v1/admin/media/${assetId}`).set(staff).expect(200);
      const staffUpload = await uploadOne(await createImage(), 'by-staff.jpg', staff);
      expect(staffUpload.status).toBe('created');
      expect(staffUpload.asset!.uploadedById).toBe(STAFF_ID);
      await request(server())
        .patch(`/api/v1/admin/media/${assetId}`)
        .set(staff)
        .send({ displayName: 'Staff edit' })
        .expect(200);
      await request(server()).delete(`/api/v1/admin/media/${assetId}`).set(staff).expect(403);
      expect(await mediaRows().count({ where: { id: assetId } })).toBe(1);
    });

    it('lets admin and owner delete', async () => {
      const first = (await uploadOne(await createImage(), 'del-1.jpg')).asset!.id;
      const second = (await uploadOne(await createImage(), 'del-2.jpg')).asset!.id;
      await request(server()).delete(`/api/v1/admin/media/${first}`).set(admin).expect(204);
      await request(server()).delete(`/api/v1/admin/media/${second}`).set(owner).expect(204);
    });
  });

  describe('upload pipeline', () => {
    it('converts to WebP, strips EXIF and GPS, caps size and creates variants', async () => {
      const original = await createImage({ width: 3000, height: 2000, withExif: true });
      const originalMetadata = await sharp(original).metadata();
      expect(originalMetadata.exif).toBeDefined();

      const result = await uploadOne(original, 'IMG_0001.JPG');
      expect(result.status).toBe('created');
      const asset = result.asset!;
      expect(asset).toMatchObject({
        mimeType: 'image/webp',
        width: 2560,
        height: 1707,
        kind: 'image',
        originalName: 'IMG_0001.JPG',
      });
      expect(asset.sizeBytes).toBeGreaterThan(0);

      const detail = (
        await request(server()).get(`/api/v1/admin/media/${asset.id}`).set(admin).expect(200)
      ).body.data;
      expect(Object.keys(detail.variants).sort()).toEqual(['large', 'medium', 'thumb']);
      expect(detail.variants.thumb.width).toBe(320);
      expect(detail.variants.medium.width).toBe(768);
      expect(detail.variants.large.width).toBe(1280);
      expect(detail.variants.thumb.mimeType).toBe('image/webp');
      expect(asset.thumbnailUrl).toBe(detail.variants.thumb.url);
      expect(asset.thumbnailUrl).not.toBe(asset.url);

      const row = await mediaRows().findOneByOrFail({ id: asset.id });
      expect(row.storageKey).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/);
      expect(row.storageKey).not.toContain('IMG_0001');
      for (const key of [row.storageKey, ...Object.values(row.variants).map((v) => v.storageKey)]) {
        expect(existsSync(join(uploadDir, ...key.split('/')))).toBe(true);
        const stored = await readFile(join(uploadDir, ...key.split('/')));
        const metadata = await sharp(stored).metadata();
        expect(metadata.format).toBe('webp');
        expect(metadata.exif).toBeUndefined();
        expect(metadata.icc).toBeUndefined();
      }
      expect(row.checksumSha256).toHaveLength(64);
    });

    it('serves the stored file from /uploads with hardened headers', async () => {
      const result = await uploadOne(await createImage({ width: 200, height: 100 }));
      const { pathname } = new URL(result.asset!.url);
      expect(pathname).toMatch(/^\/uploads\//);
      const response = await request(server()).get(pathname).expect(200);
      expect(response.headers['content-type']).toBe('image/webp');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('applies the EXIF orientation before stripping it', async () => {
      const rotated = await createImage({ width: 400, height: 200, orientation: 6 });
      const result = await uploadOne(rotated, 'rotated.jpg');
      expect(result.asset).toMatchObject({ width: 200, height: 400 });
    });

    it('does not enlarge small images and skips variants that would only copy the main file', async () => {
      const result = await uploadOne(await createImage({ width: 500, height: 300, format: 'png' }));
      const asset = result.asset!;
      expect(asset).toMatchObject({ width: 500, height: 300 });
      const detail = (
        await request(server()).get(`/api/v1/admin/media/${asset.id}`).set(admin).expect(200)
      ).body.data;
      expect(Object.keys(detail.variants)).toEqual(['thumb']);
    });

    it('accepts WebP and AVIF input', async () => {
      for (const format of ['webp', 'avif'] as const) {
        const result = await uploadOne(await createImage({ format }), `input.${format}`);
        expect(result.status).toBe('created');
        expect(result.asset!.mimeType).toBe('image/webp');
      }
    });

    it('keeps an animated GIF untouched', async () => {
      const gif = await createAnimatedGif();
      const result = await uploadOne(gif, 'spinner.gif');
      expect(result.status).toBe('created');
      expect(result.asset).toMatchObject({ mimeType: 'image/gif', width: 16, height: 16 });
      expect(result.asset!.sizeBytes).toBe(gif.length);
      expect(result.asset!.thumbnailUrl).toBe(result.asset!.url);
      const row = await mediaRows().findOneByOrFail({ id: result.asset!.id });
      expect(row.storageKey.endsWith('.gif')).toBe(true);
      expect(row.variants).toEqual({});
      const stored = await readFile(join(uploadDir, ...row.storageKey.split('/')));
      expect(stored.equals(gif)).toBe(true);
    });

    it('stores a PDF as is', async () => {
      const pdf = createPdf();
      const result = await uploadOne(pdf, 'brochure.pdf');
      expect(result.status).toBe('created');
      expect(result.asset).toMatchObject({
        mimeType: 'application/pdf',
        kind: 'pdf',
        width: null,
        height: null,
        sizeBytes: pdf.length,
      });
      expect(result.asset!.thumbnailUrl).toBe(result.asset!.url);
      const row = await mediaRows().findOneByOrFail({ id: result.asset!.id });
      expect(row.storageKey).toMatch(/\.pdf$/);
      expect((await readFile(join(uploadDir, ...row.storageKey.split('/')))).equals(pdf)).toBe(
        true,
      );
    });

    it('detects the real type: HTML renamed to .jpg with an image mimetype is rejected', async () => {
      const before = await mediaRows().count();
      const html = Buffer.from('<html><body><script>alert(document.cookie)</script></body></html>');
      const response = await upload([{ buffer: html, name: 'holiday.jpg', type: 'image/jpeg' }]);
      expect(response.status).toBe(201);
      expect(response.body.data.results[0]).toMatchObject({
        status: 'rejected',
        originalName: 'holiday.jpg',
        error: { code: 'MEDIA_UNSUPPORTED_TYPE' },
      });
      expect(response.body.data).toMatchObject({ created: 0, duplicates: 0, rejected: 1 });
      expect(await mediaRows().count()).toBe(before);
    });

    it.each([
      ['svg', 'logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'],
      ['html', 'page.html', '<!doctype html><h1>x</h1>'],
      ['executable', 'setup.exe', 'MZ\x90\x00\x03\x00\x00\x00'],
      ['shell script', 'run.sh', '#!/bin/sh\necho hi'],
    ])('rejects %s uploads', async (_label, name, content) => {
      const response = await upload([
        { buffer: Buffer.from(content, 'latin1'), name, type: 'image/png' },
      ]);
      expect(response.body.data.results[0].error.code).toBe('MEDIA_UNSUPPORTED_TYPE');
    });

    it('rejects an empty file and an image that cannot be decoded', async () => {
      const truncated = (await createImage({ width: 300, height: 300 })).subarray(0, 40);
      const response = await upload([
        { buffer: Buffer.alloc(0), name: 'empty.jpg', type: 'image/jpeg' },
        { buffer: truncated, name: 'broken.jpg', type: 'image/jpeg' },
      ]);
      expect(response.status).toBe(201);
      const [empty, broken] = response.body.data.results;
      expect(empty.error.code).toBe('MEDIA_EMPTY_FILE');
      expect(broken.error.code).toBe('MEDIA_INVALID_IMAGE');
    });

    it('reports a per-file result list for a mixed request and leaves nothing behind for rejects', async () => {
      const good = await createImage();
      const response = await upload([
        { buffer: good, name: 'good.jpg', type: 'image/jpeg' },
        { buffer: Buffer.from('<html>'), name: 'bad.jpg', type: 'image/jpeg' },
        { buffer: good, name: 'good-again.jpg', type: 'image/jpeg' },
        { buffer: createPdf(), name: 'doc.pdf', type: 'application/pdf' },
      ]);
      expect(response.status).toBe(201);
      const results = response.body.data.results as UploadResultBody[];
      expect(results.map((r) => r.status)).toEqual(['created', 'rejected', 'duplicate', 'created']);
      expect(results[2].asset!.id).toBe(results[0].asset!.id);
      expect(response.body.data).toMatchObject({ created: 2, duplicates: 1, rejected: 1 });
    });

    it('dedupes identical bytes and creates a new asset again once the first is deleted', async () => {
      const buffer = await createImage();
      const first = await uploadOne(buffer, 'a.jpg');
      const second = await uploadOne(buffer, 'renamed.jpg');
      expect(second.status).toBe('duplicate');
      expect(second.asset!.id).toBe(first.asset!.id);
      expect(await mediaRows().count({ where: { checksumSha256: await checksumOf(first) } })).toBe(
        1,
      );

      await request(server())
        .delete(`/api/v1/admin/media/${first.asset!.id}`)
        .set(admin)
        .expect(204);
      const third = await uploadOne(buffer, 'again.jpg');
      expect(third.status).toBe('created');
      expect(third.asset!.id).not.toBe(first.asset!.id);
    });

    async function checksumOf(result: UploadResultBody): Promise<string> {
      return (await mediaRows().findOneByOrFail({ id: result.asset!.id })).checksumSha256;
    }

    it('keeps the client file name as metadata only and never uses it for storage', async () => {
      const result = await uploadOne(await createImage(), '../../etc/passwd.jpg');
      expect(result.asset!.originalName).toBe('passwd.jpg');
      const row = await mediaRows().findOneByOrFail({ id: result.asset!.id });
      expect(row.storageKey).not.toContain('passwd');
      expect(row.storageKey).not.toContain('..');
    });

    it('preserves non-ASCII file names', async () => {
      const result = await uploadOne(await createImage(), 'ảnh công trình đẹp.jpg');
      expect(result.asset!.originalName).toBe('ảnh công trình đẹp.jpg');
    });

    it('stores the folder given at upload time', async () => {
      const result = await uploadOne(await createImage(), 'f.jpg', admin, { folder: 'Du an' });
      expect(result.asset!.folder).toBe('Du an');
    });

    it('validates the request itself', async () => {
      const none = await request(server()).post('/api/v1/admin/media').set(admin);
      expect(none.status).toBe(400);
      expect(none.body.error.code).toBe('MEDIA_NO_FILES');

      const badFolder = await upload(
        [{ buffer: await createImage(), name: 'x.jpg', type: 'image/jpeg' }],
        admin,
        { folder: '../../etc' },
      );
      expect(badFolder.status).toBe(400);
      expect(badFolder.body.error.code).toBe('VALIDATION_FAILED');

      const extraField = await upload(
        [{ buffer: await createImage(), name: 'x.jpg', type: 'image/jpeg' }],
        admin,
        { storageKey: '../../evil' },
      );
      expect(extraField.status).toBe(400);
    });

    it('refuses more than 20 files per request', async () => {
      const image = await createImage();
      const files = Array.from({ length: 21 }, (_, index) => ({
        buffer: image,
        name: `many-${index}.jpg`,
        type: 'image/jpeg',
      }));
      const response = await upload(files);
      expect(response.status).toBe(400);
    });

    it('refuses a file above the configured size limit with 413', async () => {
      const limit = context.moduleRef.get(storageConfig.KEY).maxFileSizeBytes;
      const response = await upload([
        { buffer: Buffer.alloc(limit + 1024), name: 'huge.jpg', type: 'image/jpeg' },
      ]);
      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  describe('list, detail and update', () => {
    let ids: Record<string, string>;

    beforeAll(async () => {
      // Isolated folder so counts do not depend on other tests
      const names = ['zebra.jpg', 'Alpha.png', 'mango.jpg'];
      ids = {};
      for (const name of names) {
        const format = name.endsWith('.png') ? 'png' : 'jpeg';
        const width = name === 'zebra.jpg' ? 900 : name === 'Alpha.png' ? 64 : 300;
        const result = await uploadOne(
          await createImage({ width, height: width, format }),
          name,
          admin,
          { folder: 'catalog' },
        );
        ids[name] = result.asset!.id;
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      const pdf = await uploadOne(createPdf(), 'spec-sheet.pdf', admin, { folder: 'catalog' });
      ids['spec-sheet.pdf'] = pdf.asset!.id;
    });

    const list = async (query: Record<string, string | number>) => {
      const response = await request(server())
        .get('/api/v1/admin/media')
        .query({ folder: 'catalog', ...query })
        .set(admin)
        .expect(200);
      return response.body as { data: any[]; meta: any };
    };

    it('sorts newest, oldest, by name (case-insensitive) and by size', async () => {
      expect((await list({})).data.map((a) => a.originalName)).toEqual([
        'spec-sheet.pdf',
        'mango.jpg',
        'Alpha.png',
        'zebra.jpg',
      ]);
      expect((await list({ sort: 'oldest' })).data.map((a) => a.originalName)).toEqual([
        'zebra.jpg',
        'Alpha.png',
        'mango.jpg',
        'spec-sheet.pdf',
      ]);
      expect((await list({ sort: 'name' })).data.map((a) => a.originalName)).toEqual([
        'Alpha.png',
        'mango.jpg',
        'spec-sheet.pdf',
        'zebra.jpg',
      ]);
      const bySize = (await list({ sort: 'size' })).data.map((a) => a.sizeBytes);
      expect(bySize).toEqual([...bySize].sort((a, b) => b - a));
      await request(server())
        .get('/api/v1/admin/media')
        .query({ sort: 'createdAt; DROP TABLE media_assets' })
        .set(admin)
        .expect(400);
    });

    it('filters by mime family and searches by name with literal wildcards', async () => {
      expect((await list({ type: 'pdf' })).data.map((a) => a.originalName)).toEqual([
        'spec-sheet.pdf',
      ]);
      expect((await list({ type: 'image' })).meta.total).toBe(3);
      expect((await list({ search: 'MANGO' })).data.map((a) => a.originalName)).toEqual([
        'mango.jpg',
      ]);
      expect((await list({ search: '%' })).data).toEqual([]);
      expect((await list({ search: '_' })).data).toEqual([]);
      expect((await list({ folder: 'no-such-folder' })).data).toEqual([]);
    });

    it('paginates and exposes url, thumbnailUrl, width, height, sizeBytes and mimeType', async () => {
      const page = await list({ pageSize: 2, page: 2, sort: 'oldest' });
      expect(page.meta).toEqual({ page: 2, pageSize: 2, total: 4, totalPages: 2 });
      expect(page.data).toHaveLength(2);
      for (const item of page.data) {
        expect(item).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            url: expect.stringMatching(/^https?:\/\//),
            thumbnailUrl: expect.stringMatching(/^https?:\/\//),
            sizeBytes: expect.any(Number),
            mimeType: expect.any(String),
          }),
        );
        expect(item).toHaveProperty('width');
        expect(item).toHaveProperty('height');
        expect(item).not.toHaveProperty('storageKey');
        expect(item).not.toHaveProperty('variants');
      }
      await request(server())
        .get('/api/v1/admin/media')
        .query({ pageSize: 101 })
        .set(admin)
        .expect(400);
    });

    it('returns detail with resolved urls, alt text and usages', async () => {
      const response = await request(server())
        .get(`/api/v1/admin/media/${ids['zebra.jpg']}`)
        .set(admin)
        .expect(200);
      expect(response.body.data).toMatchObject({
        id: ids['zebra.jpg'],
        altText: { vi: null, en: null },
        caption: { vi: null, en: null },
        usages: [],
        version: expect.any(Number),
      });
      await request(server()).get(`/api/v1/admin/media/${UNKNOWN_ID}`).set(admin).expect(404);
      await request(server()).get('/api/v1/admin/media/not-a-uuid').set(admin).expect(400);
    });

    it('updates display name, folder and bilingual alt text, and search sees the new name', async () => {
      const id = ids['mango.jpg'];
      const response = await request(server())
        .patch(`/api/v1/admin/media/${id}`)
        .set(admin)
        .send({
          displayName: 'Xoài tươi',
          folder: 'catalog',
          translations: {
            vi: { altText: 'Quả xoài chín', caption: 'Xoài Cát' },
            en: { altText: 'Ripe mango' },
          },
        })
        .expect(200);
      expect(response.body.data).toMatchObject({
        name: 'Xoài tươi',
        originalName: 'mango.jpg',
        displayName: 'Xoài tươi',
        altText: { vi: 'Quả xoài chín', en: 'Ripe mango' },
        caption: { vi: 'Xoài Cát', en: null },
      });

      const patchAgain = await request(server())
        .patch(`/api/v1/admin/media/${id}`)
        .set(admin)
        .send({ translations: { en: { altText: 'Fresh mango' } }, displayName: null })
        .expect(200);
      expect(patchAgain.body.data.altText).toEqual({ vi: 'Quả xoài chín', en: 'Fresh mango' });
      expect(patchAgain.body.data.displayName).toBeNull();
      expect(
        await context.dataSource
          .getRepository(MediaAssetTranslation)
          .count({ where: { mediaAssetId: id } }),
      ).toBe(2);

      await request(server())
        .patch(`/api/v1/admin/media/${id}`)
        .set(admin)
        .send({ displayName: 'Tên tìm kiếm riêng' })
        .expect(200);
      expect((await list({ search: 'riêng' })).data.map((a) => a.id)).toEqual([id]);
    });

    it('validates updates and enforces optimistic locking when a version is sent', async () => {
      const id = ids['Alpha.png'];
      await request(server())
        .patch(`/api/v1/admin/media/${id}`)
        .set(admin)
        .send({ storageKey: '../../evil' })
        .expect(400);
      await request(server())
        .patch(`/api/v1/admin/media/${id}`)
        .set(admin)
        .send({ displayName: 'x'.repeat(256) })
        .expect(400);
      await request(server())
        .patch(`/api/v1/admin/media/${id}`)
        .set(admin)
        .send({ translations: { vi: { altText: 'x'.repeat(301) } } })
        .expect(400);
      await request(server())
        .patch(`/api/v1/admin/media/${UNKNOWN_ID}`)
        .set(admin)
        .send({ displayName: 'x' })
        .expect(404);

      const current = (await request(server()).get(`/api/v1/admin/media/${id}`).set(admin)).body
        .data.version;
      const stale = await request(server())
        .patch(`/api/v1/admin/media/${id}`)
        .set(admin)
        .send({ displayName: 'stale', version: current + 5 })
        .expect(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');
      await request(server())
        .patch(`/api/v1/admin/media/${id}`)
        .set(admin)
        .send({ displayName: 'fresh', version: current })
        .expect(200);
    });
  });

  describe('delete', () => {
    it('blocks deletion with MEDIA_IN_USE while any relation references the asset', async () => {
      const id = (await uploadOne(await createImage(), 'in-use.jpg')).asset!.id;
      const article = await context.dataSource
        .getRepository(TestArticle)
        .save({ title: 'Cover story', coverId: id });
      const image = await context.dataSource
        .getRepository(TestArticleImage)
        .save({ mediaAssetId: id });

      const detail = await request(server())
        .get(`/api/v1/admin/media/${id}`)
        .set(admin)
        .expect(200);
      expect(detail.body.data.usages).toEqual(
        expect.arrayContaining([
          { entityName: 'TestArticle', entityId: article.id, field: 'cover' },
          { entityName: 'TestArticleImage', entityId: image.id, field: 'mediaAsset' },
        ]),
      );
      expect(detail.body.data.usages).toHaveLength(2);

      const blocked = await request(server())
        .delete(`/api/v1/admin/media/${id}`)
        .set(admin)
        .expect(409);
      expect(blocked.body.error.code).toBe('MEDIA_IN_USE');
      expect(blocked.body.error.details).toHaveLength(2);
      expect(await mediaRows().count({ where: { id } })).toBe(1);

      await context.dataSource.getRepository(TestArticleImage).delete({ id: image.id });
      await request(server()).delete(`/api/v1/admin/media/${id}`).set(admin).expect(409);
      await context.dataSource.getRepository(TestArticle).softDelete({ id: article.id });
      // A soft-deleted referencing row no longer counts as a usage
      await request(server()).delete(`/api/v1/admin/media/${id}`).set(admin).expect(204);
    });

    it('soft deletes: hidden from reads and references, row and files kept', async () => {
      const result = await uploadOne(await createImage({ width: 900, height: 900 }));
      const id = result.asset!.id;
      const keys = (await mediaRows().findOneByOrFail({ id })).storageKey;
      await request(server()).delete(`/api/v1/admin/media/${id}`).set(admin).expect(204);

      await request(server()).get(`/api/v1/admin/media/${id}`).set(admin).expect(404);
      await request(server()).delete(`/api/v1/admin/media/${id}`).set(admin).expect(404);
      const listed = await request(server())
        .get('/api/v1/admin/media')
        .query({ pageSize: 100 })
        .set(admin);
      expect(listed.body.data.some((item: { id: string }) => item.id === id)).toBe(false);

      const row = await mediaRows().findOne({ where: { id }, withDeleted: true });
      expect(row?.deletedAt).toBeInstanceOf(Date);
      expect(existsSync(join(uploadDir, ...keys.split('/')))).toBe(true);

      const references = context.moduleRef.get(MediaReferenceService);
      await expect(references.assertAllExist([id])).rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
      });
    });
  });

  describe('MediaReferenceService', () => {
    it('validates ids and resolves urls and richer asset data', async () => {
      const references = context.moduleRef.get(MediaReferenceService);
      const image = (await uploadOne(await createImage({ width: 900, height: 600 }))).asset!;
      const pdf = (await uploadOne(createPdf(), 'ref.pdf')).asset!;

      await expect(references.assertAllExist([image.id, pdf.id])).resolves.toBeUndefined();
      await expect(references.assertAllExist([])).resolves.toBeUndefined();
      await expect(references.assertAllExist([image.id, UNKNOWN_ID, 'nope'])).rejects.toMatchObject(
        {
          code: 'VALIDATION_FAILED',
        },
      );

      const urls = await references.resolveUrls([image.id, pdf.id, UNKNOWN_ID]);
      expect(urls.get(image.id)).toBe(image.url);
      expect(urls.get(pdf.id)).toBe(pdf.url);
      expect(urls.has(UNKNOWN_ID)).toBe(false);

      const assets = await references.resolveAssets([image.id, pdf.id, UNKNOWN_ID, 'nope']);
      expect(assets.get(image.id)).toEqual({
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
        width: 900,
        height: 600,
        mimeType: 'image/webp',
      });
      expect(assets.get(image.id)!.thumbnailUrl).not.toBe(image.url);
      expect(assets.get(pdf.id)).toEqual({
        url: pdf.url,
        thumbnailUrl: pdf.url,
        width: null,
        height: null,
        mimeType: 'application/pdf',
      });
      expect(assets.size).toBe(2);
    });
  });

  describe('importFromLocalFile', () => {
    it('imports a file from disk with alt text, and is idempotent', async () => {
      const mediaService = context.moduleRef.get(MediaService);
      const folder = mkdtempSync(join(tmpdir(), 'kf-media-import-'));
      const filePath = join(folder, 'hero-banner.png');
      writeFileSync(filePath, await createImage({ width: 1600, height: 900, format: 'png' }));

      const first = await mediaService.importFromLocalFile(filePath, {
        folder: 'site',
        altText: { vi: 'Ảnh bìa', en: 'Hero banner' },
        createdById: ADMIN_ID,
      });
      expect(first.status).toBe('created');
      expect(first.asset).toMatchObject({ originalName: 'hero-banner.png', folder: 'site' });
      expect(first.asset!.uploadedById).toBe(ADMIN_ID);

      const second = await mediaService.importFromLocalFile(filePath, { folder: 'site' });
      expect(second.status).toBe('duplicate');
      expect(second.asset!.id).toBe(first.asset!.id);

      const detail = await mediaService.getDetail(first.asset!.id);
      expect(detail.altText).toEqual({ vi: 'Ảnh bìa', en: 'Hero banner' });
    });

    it('rejects relative paths, missing files and unsupported content', async () => {
      const mediaService = context.moduleRef.get(MediaService);
      const folder = mkdtempSync(join(tmpdir(), 'kf-media-import-'));
      const textPath = join(folder, 'notes.jpg');
      writeFileSync(textPath, 'not an image');

      expect((await mediaService.importFromLocalFile('relative/logo.png')).status).toBe('rejected');
      expect((await mediaService.importFromLocalFile(join(folder, 'missing.png'))).status).toBe(
        'rejected',
      );
      const html = await mediaService.importFromLocalFile(textPath);
      expect(html.error?.code).toBe('MEDIA_UNSUPPORTED_TYPE');
    });
  });
});
