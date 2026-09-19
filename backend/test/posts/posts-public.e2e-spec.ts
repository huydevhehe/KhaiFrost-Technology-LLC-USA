import { Post } from '../../src/modules/posts/entities/post.entity';
import { ModuleTestingContext } from '../support/create-module-testing-context';
import {
  ADMIN,
  createPostsTestContext,
  daysFromNow,
  insertMediaAsset,
  PostsApi,
  PUBLIC,
  USERS,
} from './support/posts-test-support';

interface ListItem {
  slug: string;
  title: string;
  excerpt: string;
  category: { slug: string; name: string } | null;
  coverImage: { url: string; thumbnailUrl: string } | null;
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  tags: string[];
}

describe('Posts public API', () => {
  let context: ModuleTestingContext;
  let api: PostsApi;
  let coldChain: string;
  let hiddenCategory: string;
  const ids: Record<string, string> = {};

  const slugsOf = (items: { slug: string }[]) => items.map((item) => item.slug);

  beforeAll(async () => {
    context = await createPostsTestContext();
    api = new PostsApi(context);

    coldChain = await api.createCategory({ vi: 'Chuỗi lạnh', en: 'Cold chain' }, { sortOrder: 2 });
    hiddenCategory = await api.createCategory({ vi: 'Ẩn', en: 'Hidden' }, { sortOrder: 3 });
    await api.createCategory({ vi: 'Trống', en: 'Empty' }, { sortOrder: 1 });
    const cover = await insertMediaAsset(context, 'public-cover');

    const make = async (
      key: string,
      title: { vi: string; en: string },
      publishedAt: string,
      options: Parameters<PostsApi['createPublishedPost']>[1] = {},
    ) => {
      const post = await api.createPublishedPost(title, { slug: key, publishedAt, ...options });
      ids[key] = post.id;
    };

    await make('p1', { vi: 'Bài một', en: 'Post one' }, '2025-01-01T00:00:00.000Z', {
      categoryId: coldChain,
      isFeatured: true,
      coverImageId: cover,
      tags: { vi: ['lạnh', 'kho'], en: ['cold', 'storage'] },
    });
    await make(
      'p2',
      { vi: 'Tiết kiệm 100% điện', en: 'Save 100% energy' },
      '2025-02-01T00:00:00.000Z',
      {
        categoryId: coldChain,
      },
    );
    await make('p3', { vi: 'Bài ba', en: 'Post three' }, '2025-03-01T00:00:00.000Z', {
      categoryId: coldChain,
    });
    await make('p4', { vi: 'Bài bốn', en: 'Post four' }, '2025-04-01T00:00:00.000Z', {
      categoryId: coldChain,
    });
    await make('p5', { vi: 'Bài năm', en: 'Post five' }, '2025-05-01T00:00:00.000Z', {
      categoryId: hiddenCategory,
    });
    await make('p6', { vi: 'Bài sáu', en: 'Post six' }, '2025-06-01T00:00:00.000Z', {
      coverImageId: cover,
    });

    const detail = await api.get(`${ADMIN}/posts/${ids.p6}`, USERS.admin).expect(200);
    await api
      .patch(`${ADMIN}/posts/${ids.p6}`, USERS.admin, {
        version: detail.body.data.version,
        translations: {
          vi: {
            seoTitle: 'SEO bài sáu',
            seoDescription: 'Mô tả SEO',
            seoKeywords: 'sáu, six',
            canonicalUrl: 'https://khaifrost.com/vi/bai-viet/p6',
            noIndex: true,
            ogImageId: await insertMediaAsset(context, 'og-image', false),
          },
        },
      })
      .expect(200);

    const hidden = await api
      .get(`${ADMIN}/post-categories/${hiddenCategory}`, USERS.admin)
      .expect(200);
    await api
      .patch(`${ADMIN}/post-categories/${hiddenCategory}`, USERS.admin, {
        version: hidden.body.data.version,
        isActive: false,
      })
      .expect(200);

    const both = (title: string) => ({
      vi: { title: `${title} vi`, excerpt: 'Tóm tắt', contentHtml: '<p>Nội dung</p>' },
      en: { title: `${title} en`, excerpt: 'Summary', contentHtml: '<p>Body</p>' },
    });
    const hiddenPost = async (key: string, extra: object = {}) => {
      const post = await api.createPost({
        slug: key,
        categoryId: coldChain,
        translations: both(key),
        ...extra,
      });
      ids[key] = post.id;
      return post;
    };
    await hiddenPost('draft-post');
    await hiddenPost('review-post');
    await api
      .post(`${ADMIN}/posts/${ids['review-post']}/submit-for-review`, USERS.admin)
      .expect(200);
    await hiddenPost('archived-post');
    await api.post(`${ADMIN}/posts/${ids['archived-post']}/publish`, USERS.admin).expect(200);
    await api.post(`${ADMIN}/posts/${ids['archived-post']}/archive`, USERS.admin).expect(200);
    await hiddenPost('deleted-post');
    await api.post(`${ADMIN}/posts/${ids['deleted-post']}/publish`, USERS.admin).expect(200);
    await api.delete(`${ADMIN}/posts/${ids['deleted-post']}`, USERS.admin).expect(204);
    await make('scheduled-post', { vi: 'Hẹn giờ', en: 'Scheduled' }, daysFromNow(5), {
      categoryId: coldChain,
    });
  });

  afterAll(async () => {
    await context.close();
  });

  describe('list', () => {
    it('is reachable without a session and never leaks unpublished, scheduled or deleted posts', async () => {
      const response = await api.get(`${PUBLIC}/posts?pageSize=100`).expect(200);
      expect(slugsOf(response.body.data)).toEqual(['p6', 'p5', 'p4', 'p3', 'p2', 'p1']);
      expect(response.body.meta).toEqual({ page: 1, pageSize: 100, total: 6, totalPages: 1 });
    });

    it('returns the documented item shape in Vietnamese by default', async () => {
      const response = await api
        .get(`${PUBLIC}/posts?categorySlug=chuoi-lanh&sort=oldest`)
        .expect(200);
      const first: ListItem = response.body.data[0];
      expect(first).toMatchObject({
        slug: 'p1',
        title: 'Bài một',
        excerpt: 'Tóm tắt Bài một',
        category: { slug: 'chuoi-lanh', name: 'Chuỗi lạnh' },
        publishedAt: '2025-01-01T00:00:00.000Z',
        readingTimeMinutes: 1,
        tags: ['lạnh', 'kho'],
        isFeatured: true,
      });
      expect(first.coverImage?.url).toMatch(/2026\/01\/public-cover\.webp$/);
      expect(first.coverImage?.thumbnailUrl).toMatch(/2026\/01\/public-cover-thumb\.webp$/);
      expect(first.updatedAt).toBeDefined();
      expect(response.body.data[1].coverImage).toBeNull();
      expect(Object.keys(first)).not.toContain('contentHtml');
    });

    it('returns the requested language', async () => {
      const response = await api
        .get(`${PUBLIC}/posts?locale=en&categorySlug=chuoi-lanh&sort=oldest`)
        .expect(200);
      expect(response.body.data[0]).toMatchObject({
        title: 'Post one',
        excerpt: 'Summary of Post one',
        category: { slug: 'chuoi-lanh', name: 'Cold chain' },
        tags: ['cold', 'storage'],
      });
    });

    it('sorts newest first by default and oldest first on request', async () => {
      const newest = await api.get(`${PUBLIC}/posts?sort=newest`).expect(200);
      expect(slugsOf(newest.body.data)).toEqual(['p6', 'p5', 'p4', 'p3', 'p2', 'p1']);
      const oldest = await api.get(`${PUBLIC}/posts?sort=oldest`).expect(200);
      expect(slugsOf(oldest.body.data)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    });

    it('paginates', async () => {
      const second = await api.get(`${PUBLIC}/posts?pageSize=2&page=2`).expect(200);
      expect(slugsOf(second.body.data)).toEqual(['p4', 'p3']);
      expect(second.body.meta).toEqual({ page: 2, pageSize: 2, total: 6, totalPages: 3 });
      const beyond = await api.get(`${PUBLIC}/posts?pageSize=2&page=9`).expect(200);
      expect(beyond.body.data).toEqual([]);
    });

    it('filters by category and hides articles of an inactive category from category filtering', async () => {
      const cold = await api.get(`${PUBLIC}/posts?categorySlug=chuoi-lanh`).expect(200);
      expect(slugsOf(cold.body.data)).toEqual(['p4', 'p3', 'p2', 'p1']);
      const inactive = await api.get(`${PUBLIC}/posts?categorySlug=an`).expect(200);
      expect(inactive.body.data).toEqual([]);
      const unknown = await api.get(`${PUBLIC}/posts?categorySlug=nothing-here`).expect(200);
      expect(unknown.body.data).toEqual([]);
    });

    it('shows no category for an article whose category is inactive', async () => {
      const response = await api
        .get(`${PUBLIC}/posts?search=${encodeURIComponent('Bài năm')}`)
        .expect(200);
      expect(response.body.data[0]).toMatchObject({ slug: 'p5', category: null });
    });

    it('filters featured articles', async () => {
      const featured = await api.get(`${PUBLIC}/posts?featured=true`).expect(200);
      expect(slugsOf(featured.body.data)).toEqual(['p1']);
      const rest = await api.get(`${PUBLIC}/posts?featured=false`).expect(200);
      expect(slugsOf(rest.body.data)).toEqual(['p6', 'p5', 'p4', 'p3', 'p2']);
    });

    it('searches title and excerpt in the requested language and escapes wildcards', async () => {
      const vi = await api
        .get(`${PUBLIC}/posts?search=${encodeURIComponent('Bài ba')}`)
        .expect(200);
      expect(slugsOf(vi.body.data)).toEqual(['p3']);
      const english = await api.get(`${PUBLIC}/posts?search=three&locale=en`).expect(200);
      expect(slugsOf(english.body.data)).toEqual(['p3']);
      const wrongLanguage = await api.get(`${PUBLIC}/posts?search=three&locale=vi`).expect(200);
      expect(wrongLanguage.body.data).toEqual([]);

      const excerpt = await api
        .get(`${PUBLIC}/posts?search=${encodeURIComponent('Tóm tắt Bài bốn')}`)
        .expect(200);
      expect(slugsOf(excerpt.body.data)).toEqual(['p4']);

      const percent = await api
        .get(`${PUBLIC}/posts?search=${encodeURIComponent('%')}`)
        .expect(200);
      expect(slugsOf(percent.body.data)).toEqual(['p2']);
      const underscore = await api
        .get(`${PUBLIC}/posts?search=${encodeURIComponent('_')}`)
        .expect(200);
      expect(underscore.body.data).toEqual([]);
      const backslash = await api
        .get(`${PUBLIC}/posts?search=${encodeURIComponent('\\')}`)
        .expect(200);
      expect(backslash.body.data).toEqual([]);
    });

    it('rejects invalid query parameters', async () => {
      for (const query of [
        'locale=fr',
        'pageSize=0',
        'pageSize=101',
        'sort=random',
        'featured=maybe',
        'categorySlug=Not%20Valid',
        'unknown=1',
      ]) {
        const response = await api.get(`${PUBLIC}/posts?${query}`);
        expect([query, response.status]).toEqual([query, 400]);
      }
    });

    it('sends cache headers', async () => {
      const response = await api.get(`${PUBLIC}/posts`).expect(200);
      expect(response.headers['cache-control']).toMatch(/public/);
    });
  });

  describe('detail', () => {
    it('returns the full article in Vietnamese with SEO defaults', async () => {
      const response = await api.get(`${PUBLIC}/posts/p1`).expect(200);
      const article = response.body.data;
      expect(article).toMatchObject({
        slug: 'p1',
        locale: 'vi',
        title: 'Bài một',
        excerpt: 'Tóm tắt Bài một',
        contentHtml: '<p>Nội dung Bài một</p>',
        publishedAt: '2025-01-01T00:00:00.000Z',
        category: { slug: 'chuoi-lanh', name: 'Chuỗi lạnh' },
        tags: ['lạnh', 'kho'],
        readingTimeMinutes: 1,
        seo: {
          title: 'Bài một',
          description: 'Tóm tắt Bài một',
          keywords: 'lạnh, kho',
          canonicalUrl: null,
          noIndex: false,
        },
      });
      expect(article.seo.ogImageUrl).toMatch(/public-cover\.webp$/);
      expect(article).not.toHaveProperty('authorName');
      expect(article.updatedAt).toBeDefined();
      expect(response.headers['cache-control']).toMatch(/public/);
    });

    it('returns the English content on request', async () => {
      const response = await api.get(`${PUBLIC}/posts/p1?locale=en`).expect(200);
      expect(response.body.data).toMatchObject({
        locale: 'en',
        title: 'Post one',
        contentHtml: '<p>Body of Post one</p>',
        category: { name: 'Cold chain' },
        seo: { title: 'Post one', keywords: 'cold, storage' },
      });
    });

    it('honours explicit SEO fields and the Open Graph image', async () => {
      const response = await api.get(`${PUBLIC}/posts/p6`).expect(200);
      expect(response.body.data.seo).toMatchObject({
        title: 'SEO bài sáu',
        description: 'Mô tả SEO',
        keywords: 'sáu, six',
        canonicalUrl: 'https://khaifrost.com/vi/bai-viet/p6',
        noIndex: true,
      });
      expect(response.body.data.seo.ogImageUrl).toMatch(/og-image\.webp$/);
      const english = await api.get(`${PUBLIC}/posts/p6?locale=en`).expect(200);
      expect(english.body.data.seo).toMatchObject({ title: 'Post six', noIndex: false });
      expect(english.body.data.seo.ogImageUrl).toMatch(/public-cover\.webp$/);
    });

    it('lists up to three latest related articles from the same category, excluding itself', async () => {
      const first = await api.get(`${PUBLIC}/posts/p1`).expect(200);
      expect(slugsOf(first.body.data.related)).toEqual(['p4', 'p3', 'p2']);
      const third = await api.get(`${PUBLIC}/posts/p3?locale=en`).expect(200);
      expect(slugsOf(third.body.data.related)).toEqual(['p4', 'p2', 'p1']);
      expect(third.body.data.related[0]).toMatchObject({ title: 'Post four' });
      const uncategorised = await api.get(`${PUBLIC}/posts/p6`).expect(200);
      expect(uncategorised.body.data.related).toEqual([]);
      const inactiveCategory = await api.get(`${PUBLIC}/posts/p5`).expect(200);
      expect(inactiveCategory.body.data.related).toEqual([]);
      expect(inactiveCategory.body.data.category).toBeNull();
    });

    it('links to the previous and next article by publication date', async () => {
      const middle = await api.get(`${PUBLIC}/posts/p3`).expect(200);
      expect(middle.body.data.previous).toEqual({
        slug: 'p2',
        title: 'Tiết kiệm 100% điện',
        publishedAt: '2025-02-01T00:00:00.000Z',
      });
      expect(middle.body.data.next).toMatchObject({ slug: 'p4', title: 'Bài bốn' });
      const first = await api.get(`${PUBLIC}/posts/p1`).expect(200);
      expect(first.body.data.previous).toBeNull();
      expect(first.body.data.next).toMatchObject({ slug: 'p2' });
      const last = await api.get(`${PUBLIC}/posts/p6?locale=en`).expect(200);
      expect(last.body.data.next).toBeNull();
      expect(last.body.data.previous).toMatchObject({ slug: 'p5', title: 'Post five' });
    });

    it('answers 404 for unknown, draft, in-review, archived, scheduled and deleted slugs', async () => {
      for (const slug of [
        'nothing-here',
        'draft-post',
        'review-post',
        'archived-post',
        'deleted-post',
        'scheduled-post',
      ]) {
        const response = await api.get(`${PUBLIC}/posts/${slug}`);
        expect([slug, response.status]).toEqual([slug, 404]);
        expect(response.body.error.code).toBe('NOT_FOUND');
      }
      await api.get(`${PUBLIC}/posts/${'x'.repeat(400)}`).expect(404);
      await api.get(`${PUBLIC}/posts/p1?locale=fr`).expect(400);
    });

    it('never exposes the sanitized-away markup', async () => {
      const post = await api.createPublishedPost(
        { vi: 'An toàn', en: 'Safe' },
        { slug: 'safe-html' },
      );
      const detail = await api.get(`${ADMIN}/posts/${post.id}`, USERS.admin).expect(200);
      await api
        .patch(`${ADMIN}/posts/${post.id}`, USERS.admin, {
          version: detail.body.data.version,
          translations: {
            vi: { contentHtml: '<p onmouseover="x()">Chào</p><script>bad()</script>' },
          },
        })
        .expect(200);
      const response = await api.get(`${PUBLIC}/posts/safe-html`).expect(200);
      expect(response.body.data.contentHtml).toBe('<p>Chào</p>');
      await api.delete(`${ADMIN}/posts/${post.id}`, USERS.admin).expect(204);
    });
  });

  describe('slugs', () => {
    it('lists exactly the visible published slugs with dates', async () => {
      const response = await api.get(`${PUBLIC}/posts/slugs`).expect(200);
      expect(slugsOf(response.body.data)).toEqual(['p6', 'p5', 'p4', 'p3', 'p2', 'p1']);
      expect(response.body.data[0]).toEqual({
        slug: 'p6',
        publishedAt: '2025-06-01T00:00:00.000Z',
        updatedAt: expect.any(String),
      });
      expect(response.headers['cache-control']).toMatch(/public/);
    });
  });

  describe('categories', () => {
    it('lists active categories with counts of visible published articles', async () => {
      const response = await api.get(`${PUBLIC}/post-categories`).expect(200);
      expect(response.body.data).toEqual([
        { slug: 'trong', name: 'Trống', description: null, postCount: 0 },
        { slug: 'chuoi-lanh', name: 'Chuỗi lạnh', description: null, postCount: 4 },
      ]);
      const english = await api.get(`${PUBLIC}/post-categories?locale=en`).expect(200);
      expect(english.body.data.map((item: { name: string }) => item.name)).toEqual([
        'Empty',
        'Cold chain',
      ]);
      await api.get(`${PUBLIC}/post-categories?locale=fr`).expect(400);
    });
  });

  describe('visibility changes', () => {
    it('drops an unpublished article at once and brings it back when republished', async () => {
      const post = await api.createPublishedPost(
        { vi: 'Nhấp nháy', en: 'Flicker' },
        { slug: 'flicker' },
      );
      await api.get(`${PUBLIC}/posts/flicker`).expect(200);
      await api.post(`${ADMIN}/posts/${post.id}/unpublish`, USERS.admin).expect(200);
      await api.get(`${PUBLIC}/posts/flicker`).expect(404);
      const list = await api.get(`${PUBLIC}/posts?pageSize=100`).expect(200);
      expect(slugsOf(list.body.data)).not.toContain('flicker');
      await api.post(`${ADMIN}/posts/${post.id}/publish`, USERS.admin).expect(200);
      await api.get(`${PUBLIC}/posts/flicker`).expect(200);
      await api.delete(`${ADMIN}/posts/${post.id}`, USERS.admin).expect(204);
    });

    it('reveals a scheduled article once its date has passed', async () => {
      await api.get(`${PUBLIC}/posts/scheduled-post`).expect(404);
      const slugsBefore = await api.get(`${PUBLIC}/posts/slugs`).expect(200);
      expect(slugsOf(slugsBefore.body.data)).not.toContain('scheduled-post');

      await context.dataSource
        .getRepository(Post)
        .update({ id: ids['scheduled-post'] }, { publishedAt: new Date(Date.now() - 60_000) });

      await api.get(`${PUBLIC}/posts/scheduled-post`).expect(200);
      const slugsAfter = await api.get(`${PUBLIC}/posts/slugs`).expect(200);
      expect(slugsOf(slugsAfter.body.data)).toContain('scheduled-post');
      const categories = await api.get(`${PUBLIC}/post-categories`).expect(200);
      expect(
        categories.body.data.find((item: { slug: string }) => item.slug === 'chuoi-lanh').postCount,
      ).toBe(5);
    });
  });
});
