import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '../../src/common/constants/domain-events';
import { Role } from '../../src/common/enums/role.enum';
import { Post } from '../../src/modules/posts/entities/post.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { ModuleTestingContext } from '../support/create-module-testing-context';
import {
  ADMIN,
  createPostsTestContext,
  daysFromNow,
  insertMediaAsset,
  PostsApi,
  PUBLIC,
  TestActor,
  USERS,
} from './support/posts-test-support';

const NOT_EXISTING_ID = '00000000-0000-4000-8000-00000000dead';

describe('Posts admin API', () => {
  let context: ModuleTestingContext;
  let api: PostsApi;
  const submittedEvents: unknown[] = [];

  beforeAll(async () => {
    context = await createPostsTestContext();
    api = new PostsApi(context);
    context.moduleRef
      .get(EventEmitter2)
      .on(DomainEvent.POST_SUBMITTED_FOR_REVIEW, (payload: unknown) =>
        submittedEvents.push(payload),
      );
  });

  afterAll(async () => {
    await context.close();
  });

  const bothLanguages = (title: string) => ({
    vi: { title: `${title} vi`, excerpt: 'Tóm tắt', contentHtml: '<p>Nội dung</p>' },
    en: { title: `${title} en`, excerpt: 'Summary', contentHtml: '<p>Content</p>' },
  });

  describe('permission matrix', () => {
    let postId: string;
    let categoryId: string;

    beforeAll(async () => {
      postId = (await api.createPost({ translations: bothLanguages('Matrix') }, USERS.staff)).id;
      categoryId = await api.createCategory({ vi: 'Ma trận', en: 'Matrix' });
    });

    type Call = (actor?: TestActor) => Promise<{ status: number }>;
    const cases = (): [string, Call, boolean][] => [
      ['GET posts', (a) => api.get(`${ADMIN}/posts`, a), true],
      ['GET posts/:id', (a) => api.get(`${ADMIN}/posts/${postId}`, a), true],
      [
        'POST posts',
        (a) => api.post(`${ADMIN}/posts`, a, { translations: { vi: { title: 'Perm' } } }),
        true,
      ],
      ['PATCH posts/:id', (a) => api.patch(`${ADMIN}/posts/${postId}`, a, { version: 999 }), true],
      [
        'POST submit-for-review',
        (a) => api.post(`${ADMIN}/posts/${NOT_EXISTING_ID}/submit-for-review`, a),
        true,
      ],
      ['GET post-categories', (a) => api.get(`${ADMIN}/post-categories`, a), true],
      [
        'GET post-categories/:id',
        (a) => api.get(`${ADMIN}/post-categories/${categoryId}`, a),
        true,
      ],
      ['POST publish', (a) => api.post(`${ADMIN}/posts/${postId}/publish`, a), false],
      ['POST unpublish', (a) => api.post(`${ADMIN}/posts/${postId}/unpublish`, a), false],
      ['POST reject', (a) => api.post(`${ADMIN}/posts/${postId}/reject`, a), false],
      ['POST archive', (a) => api.post(`${ADMIN}/posts/${postId}/archive`, a), false],
      ['POST restore', (a) => api.post(`${ADMIN}/posts/${postId}/restore`, a), false],
      ['DELETE posts/:id', (a) => api.delete(`${ADMIN}/posts/${NOT_EXISTING_ID}`, a), false],
      [
        'POST post-categories',
        (a) => api.post(`${ADMIN}/post-categories`, a, { translations: {} }),
        false,
      ],
      [
        'PATCH post-categories/:id',
        (a) => api.patch(`${ADMIN}/post-categories/${categoryId}`, a, { version: 0 }),
        false,
      ],
      [
        'DELETE post-categories/:id',
        (a) => api.delete(`${ADMIN}/post-categories/${NOT_EXISTING_ID}`, a),
        false,
      ],
    ];

    it('answers 401 without a session and 403 for customers on every endpoint', async () => {
      for (const [name, call] of cases()) {
        expect([name, (await call()).status]).toEqual([name, 401]);
        expect([name, (await call(USERS.customer)).status]).toEqual([name, 403]);
      }
    });

    it('lets staff use only the endpoints their role grants', async () => {
      for (const [name, call, staffAllowed] of cases()) {
        const { status } = await call(USERS.staff);
        if (staffAllowed) expect([name, status]).not.toEqual([name, 403]);
        else expect([name, status]).toEqual([name, 403]);
      }
    });

    it('lets admins and owners through every endpoint', async () => {
      for (const [name, call] of cases()) {
        for (const actor of [USERS.admin, USERS.owner]) {
          const { status } = await call(actor);
          expect([name, status < 500 && status !== 401 && status !== 403]).toEqual([name, true]);
        }
      }
    });
  });

  describe('creating posts', () => {
    it('creates a draft owned by the caller with derived fields', async () => {
      const post = await api.createPost(
        {
          translations: {
            vi: {
              title: 'Bài viết đầu tiên',
              contentHtml: '<p>Đây là nội dung của bài viết đầu tiên.</p>',
              tags: [' Chuỗi lạnh ', 'chuỗi lạnh', 'AI'],
            },
          },
          authorName: 'Nguyễn An',
          isFeatured: true,
        },
        USERS.staff,
      );
      expect(post).toMatchObject({
        slug: 'bai-viet-dau-tien',
        status: 'draft',
        publishedAt: null,
        isFeatured: true,
        authorId: USERS.staff.id,
        authorName: 'Nguyễn An',
        createdById: USERS.staff.id,
        version: 1,
        missingLocales: ['en'],
        category: null,
        coverImage: null,
      });
      expect(post.translations.en).toBeNull();
      expect(post.translations.vi).toMatchObject({
        title: 'Bài viết đầu tiên',
        excerpt: 'Đây là nội dung của bài viết đầu tiên.',
        readingTimeMinutes: 1,
        tags: ['Chuỗi lạnh', 'AI'],
        noIndex: false,
      });
    });

    it('defaults the byline and computes reading time from the plain text', async () => {
      const words = Array.from({ length: 450 }, () => 'word').join(' ');
      const post = await api.createPost({
        translations: { en: { title: 'Long read', contentHtml: `<p>${words}</p>` } },
      });
      expect(post.authorName).toBe('KhaiFrost');
      expect(post.slug).toBe('long-read');
      expect(post.translations.en.readingTimeMinutes).toBe(3);
      expect(post.missingLocales).toEqual(['vi']);
    });

    it('never names an owner as the default author but keeps other creators', async () => {
      const users = context.dataSource.getRepository(User);
      const seed = (id: string, role: Role, fullName: string, n: number) =>
        users.save(
          users.create({
            id,
            fullName,
            email: `byline${n}@example.com`,
            phone: `+8491000000${n}`,
            passwordHash: 'x',
            role,
          }),
        );
      await seed(USERS.owner.id, Role.OWNER, 'Chủ Thật', 1);
      await seed(USERS.staff.id, Role.STAFF, 'Nhân Viên Thật', 2);
      const translations = { en: { title: 'Byline check', contentHtml: '<p>x</p>' } };
      const byOwner = await api.createPost({ translations }, USERS.owner);
      expect(byOwner.authorName).toBe('KhaiFrost');
      const byStaff = await api.createPost({ translations }, USERS.staff);
      expect(byStaff.authorName).toBe('Nhân Viên Thật');
    });

    it('stores sanitized HTML and plain-text titles', async () => {
      const post = await api.createPost({
        translations: {
          vi: {
            title: '<b>AI</b> & Cloud',
            excerpt: '<i>Tóm tắt</i> an toàn',
            contentHtml:
              '<h2 onclick="steal()">Tiêu đề</h2><script>alert(1)</script><p>Chữ <a href="javascript:alert(1)">bấm</a> <a href="https://khaifrost.com">đây</a></p><img src="x" onerror="alert(1)"><iframe src="https://evil.test"></iframe>',
          },
        },
      });
      const vi = post.translations.vi;
      expect(vi.title).toBe('AI & Cloud');
      expect(vi.excerpt).toBe('Tóm tắt an toàn');
      expect(vi.contentHtml).not.toMatch(/script|onclick|onerror|javascript:|iframe|alert/);
      expect(vi.contentHtml).toContain('<h2>Tiêu đề</h2>');
      expect(vi.contentHtml).toContain('href="https://khaifrost.com"');
      expect(vi.contentHtml).toContain('rel="noopener noreferrer"');

      const stored = await context.dataSource
        .getRepository(Post)
        .findOneOrFail({ where: { id: post.id }, relations: { translations: true } });
      expect(stored.translations?.[0].contentHtml).toBe(vi.contentHtml);
    });

    it('rejects invalid payloads with VALIDATION_FAILED', async () => {
      const invalid: object[] = [
        {},
        { translations: {} },
        { translations: { vi: { title: '   ' } } },
        { translations: { vi: { title: 'x'.repeat(256) } } },
        {
          translations: {
            vi: { title: 'Ok', tags: Array.from({ length: 21 }, (_, i) => `t${i}`) },
          },
        },
        { translations: { vi: { title: 'Ok' } }, slug: 'Not A Slug' },
        { translations: { vi: { title: 'Ok' } }, categoryId: 'not-a-uuid' },
        { translations: { vi: { title: 'Ok' } }, extra: true },
        { translations: { fr: { title: 'Bonjour' } } },
        { translations: { vi: { title: 'Ok', canonicalUrl: 'not a url' } } },
      ];
      for (const body of invalid) {
        const response = await api.post(`${ADMIN}/posts`, USERS.admin, body);
        expect([JSON.stringify(body), response.status]).toEqual([JSON.stringify(body), 400]);
        expect(response.body.error.code).toBe('VALIDATION_FAILED');
      }
    });

    it('rejects an unknown category or cover image', async () => {
      const unknownCategory = await api
        .post(`${ADMIN}/posts`, USERS.admin, {
          translations: { vi: { title: 'A' } },
          categoryId: NOT_EXISTING_ID,
        })
        .expect(400);
      expect(unknownCategory.body.error.code).toBe('VALIDATION_FAILED');

      const unknownCover = await api
        .post(`${ADMIN}/posts`, USERS.admin, {
          translations: { vi: { title: 'A' } },
          coverImageId: NOT_EXISTING_ID,
        })
        .expect(400);
      expect(unknownCover.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('attaches a category and a cover image and exposes the thumbnail', async () => {
      const categoryId = await api.createCategory({ vi: 'Chuỗi lạnh', en: 'Cold chain' });
      const coverId = await insertMediaAsset(context, 'cover-one');
      const noVariantId = await insertMediaAsset(context, 'cover-plain', false);

      const post = await api.createPost({
        translations: { vi: { title: 'Có ảnh bìa' } },
        categoryId,
        coverImageId: coverId,
      });
      expect(post.category).toEqual({
        id: categoryId,
        slug: 'chuoi-lanh',
        names: { vi: 'Chuỗi lạnh', en: 'Cold chain' },
      });
      expect(post.coverImage.id).toBe(coverId);
      expect(post.coverImage.url).toMatch(/2026\/01\/cover-one\.webp$/);
      expect(post.coverImage.thumbnailUrl).toMatch(/2026\/01\/cover-one-thumb\.webp$/);

      const plain = await api.createPost({
        translations: { vi: { title: 'Ảnh không biến thể' } },
        coverImageId: noVariantId,
      });
      expect(plain.coverImage.thumbnailUrl).toBe(plain.coverImage.url);
    });
  });

  describe('slugs', () => {
    it('adds a numeric suffix for a repeated title', async () => {
      const first = await api.createPost({ translations: { vi: { title: 'Trùng tiêu đề' } } });
      const second = await api.createPost({ translations: { vi: { title: 'Trùng tiêu đề' } } });
      expect([first.slug, second.slug]).toEqual(['trung-tieu-de', 'trung-tieu-de-2']);
    });

    it('accepts a supplied slug and rejects a taken or reserved one with 409 SLUG_TAKEN', async () => {
      await api.createPost({ slug: 'my-own-slug', translations: { vi: { title: 'Own' } } });
      for (const slug of ['my-own-slug', 'slugs']) {
        const response = await api
          .post(`${ADMIN}/posts`, USERS.admin, { slug, translations: { vi: { title: 'Again' } } })
          .expect(409);
        expect(response.body.error.code).toBe('SLUG_TAKEN');
      }
    });

    it('survives simultaneous creates of the same title', async () => {
      const responses = await Promise.all(
        Array.from({ length: 2 }, () =>
          api.post(`${ADMIN}/posts`, USERS.admin, { translations: { vi: { title: 'Đua nhau' } } }),
        ),
      );
      expect(responses.map((response) => response.status)).toEqual([201, 201]);
      const slugs = responses.map((response) => response.body.data.slug as string);
      expect([...slugs].sort()).toEqual(['dua-nhau', 'dua-nhau-2']);
    });

    it('frees the slug of a soft-deleted post', async () => {
      const post = await api.createPost({
        slug: 'reusable',
        translations: { vi: { title: 'Cũ' } },
      });
      await api.delete(`${ADMIN}/posts/${post.id}`, USERS.admin).expect(204);
      const again = await api.createPost({
        slug: 'reusable',
        translations: { vi: { title: 'Mới' } },
      });
      expect(again.slug).toBe('reusable');
      expect(again.id).not.toBe(post.id);
    });

    it('enforces uniqueness in the database for live rows', async () => {
      const repository = context.dataSource.getRepository(Post);
      const existing = await api.createPost({ translations: { vi: { title: 'Ràng buộc' } } });
      await expect(
        repository.save(repository.create({ slug: existing.slug, authorName: 'x' })),
      ).rejects.toThrow(/uq_posts_slug/);
    });

    it('changes the slug on update and rejects a taken one', async () => {
      const a = await api.createPost({ translations: { vi: { title: 'Đổi slug A' } } });
      const b = await api.createPost({ translations: { vi: { title: 'Đổi slug B' } } });
      const taken = await api
        .patch(`${ADMIN}/posts/${b.id}`, USERS.admin, { version: b.version, slug: a.slug })
        .expect(409);
      expect(taken.body.error.code).toBe('SLUG_TAKEN');

      const renamed = await api
        .patch(`${ADMIN}/posts/${b.id}`, USERS.admin, { version: b.version, slug: 'slug-moi' })
        .expect(200);
      expect(renamed.body.data.slug).toBe('slug-moi');
    });
  });

  describe('updating posts', () => {
    it('merges partial translations, keeps the other language and bumps the version', async () => {
      const post = await api.createPost({ translations: bothLanguages('Merge') });
      const response = await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: post.version,
          translations: { en: { title: 'Merged title', tags: ['One', 'one', 'Two'] } },
          isFeatured: true,
          authorName: 'Ai đó',
        })
        .expect(200);
      const updated = response.body.data;
      expect(updated.version).toBe(post.version + 1);
      expect(updated.isFeatured).toBe(true);
      expect(updated.authorName).toBe('Ai đó');
      expect(updated.translations.en).toMatchObject({
        title: 'Merged title',
        excerpt: 'Summary',
        tags: ['One', 'Two'],
      });
      expect(updated.translations.vi.title).toBe('Merge vi');
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(post.updatedAt).getTime(),
      );
    });

    it('bumps the version even when only a translation changes', async () => {
      const post = await api.createPost({ translations: bothLanguages('Bump') });
      const response = await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: post.version,
          translations: { vi: { contentHtml: '<p>Mới</p>' } },
        })
        .expect(200);
      expect(response.body.data.version).toBe(post.version + 1);
      expect(response.body.data.translations.vi.contentHtml).toBe('<p>Mới</p>');
    });

    it('re-derives a blank excerpt when it is cleared', async () => {
      const post = await api.createPost({ translations: bothLanguages('Excerpt') });
      const response = await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: post.version,
          translations: { vi: { excerpt: '', contentHtml: '<p>Nội dung mới hoàn toàn</p>' } },
        })
        .expect(200);
      expect(response.body.data.translations.vi.excerpt).toBe('Nội dung mới hoàn toàn');
    });

    it('rejects a stale version with 409 VERSION_CONFLICT and a missing one with 400', async () => {
      const post = await api.createPost({ translations: bothLanguages('Locking') });
      await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: post.version,
          isFeatured: true,
        })
        .expect(200);
      const stale = await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: post.version,
          isFeatured: false,
        })
        .expect(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');
      expect(stale.body.error.details).toEqual({
        currentVersion: post.version + 1,
        expectedVersion: post.version,
      });
      const missing = await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, { isFeatured: false })
        .expect(400);
      expect(missing.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('lets two concurrent edits with the same version succeed only once', async () => {
      const post = await api.createPost({ translations: bothLanguages('Race') });
      const responses = await Promise.all(
        [true, false].map((isFeatured) =>
          api.patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
            version: post.version,
            isFeatured,
          }),
        ),
      );
      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    });

    it('can clear the category and cover image with null', async () => {
      const categoryId = await api.createCategory({ vi: 'Tạm', en: 'Temp' });
      const post = await api.createPost({
        translations: { vi: { title: 'Xóa liên kết' } },
        categoryId,
      });
      const response = await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: post.version,
          categoryId: null,
        })
        .expect(200);
      expect(response.body.data.category).toBeNull();
    });

    it('answers 404 for an unknown or malformed id', async () => {
      await api.patch(`${ADMIN}/posts/${NOT_EXISTING_ID}`, USERS.admin, { version: 1 }).expect(404);
      await api.get(`${ADMIN}/posts/not-a-uuid`, USERS.admin).expect(404);
      await api.get(`${ADMIN}/posts/${NOT_EXISTING_ID}`, USERS.admin).expect(404);
    });
  });

  describe('ownership rules', () => {
    it('lets staff edit and submit only their own drafts', async () => {
      const own = await api.createPost({ translations: bothLanguages('Own') }, USERS.staff);
      const foreign = await api.createPost(
        { translations: bothLanguages('Foreign') },
        USERS.otherStaff,
      );

      await api
        .patch(`${ADMIN}/posts/${own.id}`, USERS.staff, { version: own.version, isFeatured: true })
        .expect(200);
      const denied = await api
        .patch(`${ADMIN}/posts/${foreign.id}`, USERS.staff, {
          version: foreign.version,
          isFeatured: true,
        })
        .expect(403);
      expect(denied.body.error.code).toBe('FORBIDDEN');
      await api.post(`${ADMIN}/posts/${foreign.id}/submit-for-review`, USERS.staff).expect(403);
      await api.post(`${ADMIN}/posts/${own.id}/submit-for-review`, USERS.staff).expect(200);
    });

    it('lets staff keep editing their own post while it is in review', async () => {
      const post = await api.createPost(
        { translations: bothLanguages('Review edit') },
        USERS.staff,
      );
      const submitted = await api
        .post(`${ADMIN}/posts/${post.id}/submit-for-review`, USERS.staff)
        .expect(200);
      await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.staff, {
          version: submitted.body.data.version,
          isFeatured: true,
        })
        .expect(200);
    });

    it('needs post:update-any to edit published content, even for the author', async () => {
      const post = await api.createPost({ translations: bothLanguages('Live') }, USERS.staff);
      const published = await api
        .post(`${ADMIN}/posts/${post.id}/publish`, USERS.admin)
        .expect(200);
      const version = published.body.data.version;

      const denied = await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.staff, { version, isFeatured: true })
        .expect(403);
      expect(denied.body.error.code).toBe('FORBIDDEN');
      await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, { version, isFeatured: true })
        .expect(200);
    });

    it('lets admins edit anybody’s draft', async () => {
      const post = await api.createPost({ translations: bothLanguages('Admin edit') }, USERS.staff);
      await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: post.version,
          isFeatured: true,
        })
        .expect(200);
    });

    it('only lets publishers change the publication date', async () => {
      const post = await api.createPost({ translations: bothLanguages('Date') }, USERS.staff);
      await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.staff, {
          version: post.version,
          publishedAt: daysFromNow(3),
        })
        .expect(403);
      const scheduled = await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: post.version,
          publishedAt: daysFromNow(3),
        })
        .expect(200);
      expect(scheduled.body.data.publishedAt).not.toBeNull();
      expect(scheduled.body.data.status).toBe('draft');
    });
  });

  describe('workflow', () => {
    const transition = (
      id: string,
      action: string,
      actor: TestActor = USERS.admin,
      body?: object,
    ) => api.post(`${ADMIN}/posts/${id}/${action}`, actor, body);

    it('lets a reviewer send a post in review back to draft, and the author submit it again', async () => {
      const post = await api.createPost({ translations: bothLanguages('Rejected') }, USERS.staff);
      await transition(post.id, 'reject').expect(409);
      await transition(post.id, 'submit-for-review', USERS.staff).expect(200);
      await transition(post.id, 'reject', USERS.staff).expect(403);
      const rejected = await transition(post.id, 'reject').expect(200);
      expect(rejected.body.data.status).toBe('draft');
      await transition(post.id, 'submit-for-review', USERS.staff).expect(200);
    });

    it('walks draft -> in_review -> published -> draft -> archived -> draft', async () => {
      const post = await api.createPost({ translations: bothLanguages('Walk') }, USERS.staff);

      const submitted = await transition(post.id, 'submit-for-review', USERS.staff).expect(200);
      expect(submitted.body.data.status).toBe('in_review');

      const published = await transition(post.id, 'publish').expect(200);
      expect(published.body.data.status).toBe('published');
      expect(published.body.data.publishedAt).not.toBeNull();
      const firstPublishedAt = published.body.data.publishedAt;

      const unpublished = await transition(post.id, 'unpublish').expect(200);
      expect(unpublished.body.data.status).toBe('draft');

      const republished = await transition(post.id, 'publish').expect(200);
      expect(republished.body.data.publishedAt).toBe(firstPublishedAt);

      const archived = await transition(post.id, 'archive').expect(200);
      expect(archived.body.data.status).toBe('archived');

      const restored = await transition(post.id, 'restore').expect(200);
      expect(restored.body.data.status).toBe('draft');
    });

    it('rejects impossible transitions with 409 INVALID_STATUS_TRANSITION', async () => {
      const post = await api.createPost({ translations: bothLanguages('Blocked') });
      for (const action of ['unpublish', 'restore']) {
        const response = await transition(post.id, action).expect(409);
        expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      }
      await transition(post.id, 'submit-for-review').expect(200);
      await transition(post.id, 'submit-for-review').expect(409);
      await transition(post.id, 'publish').expect(200);
      await transition(post.id, 'publish').expect(409);
      await transition(post.id, 'archive').expect(200);
      await transition(post.id, 'archive').expect(409);
      await transition(post.id, 'publish').expect(409);
      await transition(post.id, 'submit-for-review').expect(409);
    });

    it('emits post.submitted-for-review once, after the commit, with the vi title', async () => {
      submittedEvents.length = 0;
      const post = await api.createPost({ translations: bothLanguages('Event') }, USERS.staff);
      await transition(post.id, 'submit-for-review', USERS.staff).expect(200);
      await transition(post.id, 'submit-for-review', USERS.staff).expect(409);
      await transition(post.id, 'publish').expect(200);
      expect(submittedEvents).toEqual([
        { postId: post.id, title: 'Event vi', authorId: USERS.staff.id },
      ]);
    });

    it('refuses to publish without both languages and lists what is missing', async () => {
      const post = await api.createPost({
        translations: { vi: { title: 'Chỉ tiếng Việt', contentHtml: '<p>x</p>' } },
      });
      const response = await transition(post.id, 'publish').expect(422);
      expect(response.body.error.code).toBe('TRANSLATION_MISSING');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          { locale: 'en', field: 'title' },
          { locale: 'en', field: 'excerpt' },
          { locale: 'en', field: 'contentHtml' },
        ]),
      );
      expect(response.body.error.details).toHaveLength(3);
      const detail = await api.get(`${ADMIN}/posts/${post.id}`, USERS.admin).expect(200);
      expect(detail.body.data.status).toBe('draft');
      expect(detail.body.data.missingLocales).toEqual(['en']);
    });

    it('refuses to publish when a field is only whitespace', async () => {
      const post = await api.createPost({
        translations: {
          ...bothLanguages('Blank'),
          en: { title: 'Blank en', excerpt: 'x', contentHtml: '   ' },
        },
      });
      const response = await transition(post.id, 'publish').expect(422);
      expect(response.body.error.details).toEqual([{ locale: 'en', field: 'contentHtml' }]);
    });

    it('keeps a published post complete when it is edited', async () => {
      const post = await api.createPost({ translations: bothLanguages('Stay complete') });
      const published = await transition(post.id, 'publish').expect(200);
      const response = await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: published.body.data.version,
          translations: { en: { title: '' } },
        })
        .expect(422);
      expect(response.body.error.code).toBe('TRANSLATION_MISSING');
    });

    it('schedules a post with a future date and keeps it hidden until then', async () => {
      const post = await api.createPost({ translations: bothLanguages('Scheduled') });
      const scheduled = await transition(post.id, 'publish', USERS.admin, {
        publishedAt: daysFromNow(2),
      }).expect(200);
      expect(scheduled.body.data.status).toBe('published');
      await api.get(`${PUBLIC}/posts/${post.slug}`).expect(404);
    });

    it('answers 404 for transitions on unknown ids', async () => {
      await transition(NOT_EXISTING_ID, 'publish').expect(404);
      await transition(NOT_EXISTING_ID, 'submit-for-review', USERS.staff).expect(404);
    });
  });

  describe('listing', () => {
    let categoryA: string;
    let categoryB: string;

    beforeAll(async () => {
      categoryA = await api.createCategory({ vi: 'Nhóm A', en: 'Group A' });
      categoryB = await api.createCategory({ vi: 'Nhóm B', en: 'Group B' });
      const cover = await insertMediaAsset(context, 'list-cover');

      await api.createPost(
        {
          slug: 'list-alpha',
          categoryId: categoryA,
          coverImageId: cover,
          translations: {
            vi: { title: 'Alpha tiếng Việt', excerpt: 'a', contentHtml: '<p>a</p>' },
            en: { title: 'Alpha english', excerpt: 'a', contentHtml: '<p>a</p>' },
          },
        },
        USERS.staff,
      );
      await api.createPost({
        slug: 'list-beta',
        categoryId: categoryB,
        isFeatured: true,
        translations: {
          vi: { title: 'Beta chỉ có tiếng Việt', excerpt: 'b', contentHtml: '<p>b</p>' },
        },
      });
      await api.createPublishedPost(
        { vi: 'Gamma đã đăng', en: 'Gamma published' },
        { slug: 'list-gamma', categoryId: categoryA, publishedAt: '2026-03-10T00:00:00.000Z' },
      );
      await api.createPost({
        slug: 'list-percent',
        translations: {
          vi: { title: 'Giảm 100% chi phí', excerpt: 'p', contentHtml: '<p>p</p>' },
          en: { title: 'Save 100% of costs', excerpt: 'p', contentHtml: '<p>p</p>' },
        },
      });
      await api.createPost({
        slug: 'list-underscore',
        translations: {
          vi: { title: 'Dấu_gạch dưới', excerpt: 'p', contentHtml: '<p>p</p>' },
          en: { title: 'Under_score', excerpt: 'p', contentHtml: '<p>p</p>' },
        },
      });
      await api.createPost({
        slug: 'list-plain',
        translations: { en: { title: 'Plain english only' } },
      });
    });

    const slugsOf = (response: { body: { data: { slug: string }[] } }) =>
      response.body.data
        .map((item) => item.slug)
        .filter((slug) => slug.startsWith('list-'))
        .sort();

    it('returns rich rows with pagination meta', async () => {
      const response = await api.get(`${ADMIN}/posts?search=list-alpha`, USERS.staff).expect(200);
      expect(response.body.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
      const [item] = response.body.data;
      expect(item).toMatchObject({
        slug: 'list-alpha',
        status: 'draft',
        title: 'Alpha tiếng Việt',
        titles: { vi: 'Alpha tiếng Việt', en: 'Alpha english' },
        category: { id: categoryA, slug: 'nhom-a', name: 'Nhóm A' },
        authorId: USERS.staff.id,
        missingLocales: [],
        isFeatured: false,
      });
      expect(item.coverThumbnailUrl).toMatch(/list-cover-thumb\.webp$/);
      expect(item.updatedAt).toBeDefined();
      expect(item.version).toBe(1);
    });

    it('uses the requested locale for the title and falls back to the other one', async () => {
      const english = await api
        .get(`${ADMIN}/posts?search=list-alpha&locale=en`, USERS.admin)
        .expect(200);
      expect(english.body.data[0].title).toBe('Alpha english');
      expect(english.body.data[0].category.name).toBe('Group A');

      const fallback = await api
        .get(`${ADMIN}/posts?search=list-beta&locale=en`, USERS.admin)
        .expect(200);
      expect(fallback.body.data[0].title).toBe('Beta chỉ có tiếng Việt');
      expect(fallback.body.data[0].titles).toEqual({ vi: 'Beta chỉ có tiếng Việt', en: null });
      expect(fallback.body.data[0].missingLocales).toEqual(['en']);
    });

    it('filters by status, category, author and featured flag', async () => {
      const published = await api
        .get(`${ADMIN}/posts?status=published&pageSize=100`, USERS.admin)
        .expect(200);
      expect(slugsOf(published)).toEqual(['list-gamma']);

      const byCategory = await api
        .get(`${ADMIN}/posts?categoryId=${categoryA}&pageSize=100`, USERS.admin)
        .expect(200);
      expect(slugsOf(byCategory)).toEqual(['list-alpha', 'list-gamma']);

      const byAuthor = await api
        .get(`${ADMIN}/posts?authorId=${USERS.staff.id}&pageSize=100`, USERS.admin)
        .expect(200);
      expect(
        byAuthor.body.data.every((item: { authorId: string }) => item.authorId === USERS.staff.id),
      ).toBe(true);
      expect(slugsOf(byAuthor)).toContain('list-alpha');
      expect(slugsOf(byAuthor)).not.toContain('list-beta');

      const featured = await api
        .get(`${ADMIN}/posts?isFeatured=true&pageSize=100`, USERS.admin)
        .expect(200);
      expect(slugsOf(featured)).toEqual(['list-beta']);
      const notFeatured = await api
        .get(`${ADMIN}/posts?isFeatured=false&pageSize=100`, USERS.admin)
        .expect(200);
      expect(slugsOf(notFeatured)).not.toContain('list-beta');
    });

    it('searches Vietnamese and English titles case-insensitively', async () => {
      const vi = await api
        .get(`${ADMIN}/posts?search=${encodeURIComponent('tiếng')}`, USERS.admin)
        .expect(200);
      expect(slugsOf(vi)).toEqual(['list-alpha', 'list-beta']);
      const en = await api
        .get(`${ADMIN}/posts?search=ENGLISH&pageSize=100`, USERS.admin)
        .expect(200);
      expect(slugsOf(en)).toEqual(['list-alpha', 'list-plain']);
    });

    it('treats % and _ in the search as literal characters', async () => {
      const percent = await api
        .get(`${ADMIN}/posts?search=${encodeURIComponent('100%')}`, USERS.admin)
        .expect(200);
      expect(slugsOf(percent)).toEqual(['list-percent']);
      const wildcard = await api
        .get(`${ADMIN}/posts?search=${encodeURIComponent('%')}`, USERS.admin)
        .expect(200);
      expect(slugsOf(wildcard)).toEqual(['list-percent']);
      const underscore = await api
        .get(`${ADMIN}/posts?search=${encodeURIComponent('u_d')}`, USERS.admin)
        .expect(200);
      expect(slugsOf(underscore)).toEqual([]);
      const literalUnderscore = await api
        .get(`${ADMIN}/posts?search=${encodeURIComponent('Under_score')}`, USERS.admin)
        .expect(200);
      expect(slugsOf(literalUnderscore)).toEqual(['list-underscore']);
      const backslash = await api
        .get(`${ADMIN}/posts?search=${encodeURIComponent('\\')}`, USERS.admin)
        .expect(200);
      expect(backslash.body.data).toEqual([]);
    });

    it('finds posts that miss a language', async () => {
      const missingEnglish = await api
        .get(`${ADMIN}/posts?missingLocale=en&pageSize=100`, USERS.admin)
        .expect(200);
      expect(slugsOf(missingEnglish)).toEqual(expect.arrayContaining(['list-beta']));
      expect(slugsOf(missingEnglish)).not.toContain('list-alpha');
      expect(slugsOf(missingEnglish)).not.toContain('list-gamma');

      const missingVietnamese = await api
        .get(`${ADMIN}/posts?missingLocale=vi&pageSize=100`, USERS.admin)
        .expect(200);
      expect(slugsOf(missingVietnamese)).toContain('list-plain');
      expect(slugsOf(missingVietnamese)).not.toContain('list-beta');
      expect(
        missingVietnamese.body.data.every((item: { missingLocales: string[] }) =>
          item.missingLocales.includes('vi'),
        ),
      ).toBe(true);
    });

    it('filters by a date range on updatedAt or publishedAt', async () => {
      const inRange = await api
        .get(
          `${ADMIN}/posts?dateField=publishedAt&dateFrom=2026-03-01T00:00:00Z&dateTo=2026-03-31T00:00:00Z&pageSize=100`,
          USERS.admin,
        )
        .expect(200);
      expect(slugsOf(inRange)).toEqual(['list-gamma']);
      const outOfRange = await api
        .get(
          `${ADMIN}/posts?dateField=publishedAt&dateFrom=2026-04-01T00:00:00Z&dateTo=2026-04-30T00:00:00Z`,
          USERS.admin,
        )
        .expect(200);
      expect(outOfRange.body.data).toEqual([]);

      const future = await api
        .get(`${ADMIN}/posts?dateFrom=${encodeURIComponent(daysFromNow(1))}`, USERS.admin)
        .expect(200);
      expect(future.body.data).toEqual([]);
      const updatedRecently = await api
        .get(
          `${ADMIN}/posts?dateFrom=${encodeURIComponent(daysFromNow(-1))}&search=list-alpha`,
          USERS.admin,
        )
        .expect(200);
      expect(slugsOf(updatedRecently)).toEqual(['list-alpha']);
    });

    it('sorts only by allow-listed fields and paginates', async () => {
      const ascending = await api
        .get(`${ADMIN}/posts?search=list-&sortBy=slug&sortOrder=asc&pageSize=100`, USERS.admin)
        .expect(200);
      const slugs = ascending.body.data.map((item: { slug: string }) => item.slug);
      expect(slugs).toEqual([...slugs].sort());

      const descending = await api
        .get(`${ADMIN}/posts?search=list-&sortBy=slug&sortOrder=desc&pageSize=100`, USERS.admin)
        .expect(200);
      expect(descending.body.data.map((item: { slug: string }) => item.slug)).toEqual(
        [...slugs].reverse(),
      );

      const notAllowed = await api.get(`${ADMIN}/posts?sortBy=authorName`, USERS.admin).expect(200);
      expect(notAllowed.body.data.length).toBeGreaterThan(0);
      await api.get(`${ADMIN}/posts?sortBy=slug;drop`, USERS.admin).expect(400);

      const pageOne = await api
        .get(`${ADMIN}/posts?search=list-&sortBy=slug&sortOrder=asc&pageSize=2&page=1`, USERS.admin)
        .expect(200);
      const pageTwo = await api
        .get(`${ADMIN}/posts?search=list-&sortBy=slug&sortOrder=asc&pageSize=2&page=2`, USERS.admin)
        .expect(200);
      expect(pageOne.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 6, totalPages: 3 });
      expect(pageOne.body.data.map((item: { slug: string }) => item.slug)).toEqual(
        slugs.slice(0, 2),
      );
      expect(pageTwo.body.data.map((item: { slug: string }) => item.slug)).toEqual(
        slugs.slice(2, 4),
      );
    });

    it('rejects invalid filters', async () => {
      for (const query of [
        'status=nope',
        'categoryId=x',
        'isFeatured=maybe',
        'missingLocale=fr',
        'pageSize=1000',
        'dateFrom=yesterday',
      ]) {
        const response = await api.get(`${ADMIN}/posts?${query}`, USERS.admin);
        expect([query, response.status]).toEqual([query, 400]);
      }
    });
  });

  describe('deleting', () => {
    it('soft deletes for post:delete holders and hides the post everywhere', async () => {
      const post = await api.createPost({ translations: bothLanguages('Doomed') }, USERS.staff);
      await api.delete(`${ADMIN}/posts/${post.id}`, USERS.staff).expect(403);
      await api.delete(`${ADMIN}/posts/${post.id}`, USERS.admin).expect(204);
      await api.get(`${ADMIN}/posts/${post.id}`, USERS.admin).expect(404);
      await api.delete(`${ADMIN}/posts/${post.id}`, USERS.admin).expect(404);
      const list = await api.get(`${ADMIN}/posts?search=Doomed`, USERS.admin).expect(200);
      expect(list.body.data).toEqual([]);

      const row = await context.dataSource
        .getRepository(Post)
        .findOne({ where: { id: post.id }, withDeleted: true });
      expect(row?.deletedAt).not.toBeNull();
    });

    it('takes a published post off the public site', async () => {
      const post = await api.createPublishedPost({ vi: 'Xóa đã đăng', en: 'Delete published' });
      await api.get(`${PUBLIC}/posts/${post.slug}`).expect(200);
      await api.delete(`${ADMIN}/posts/${post.id}`, USERS.owner).expect(204);
      await api.get(`${PUBLIC}/posts/${post.slug}`).expect(404);
    });
  });
});
