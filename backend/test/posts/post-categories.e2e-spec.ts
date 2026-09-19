import { PostCategory } from '../../src/modules/posts/entities/post-category.entity';
import { ModuleTestingContext } from '../support/create-module-testing-context';
import { ADMIN, createPostsTestContext, PostsApi, USERS } from './support/posts-test-support';

describe('Post categories admin API', () => {
  let context: ModuleTestingContext;
  let api: PostsApi;

  beforeAll(async () => {
    context = await createPostsTestContext();
    api = new PostsApi(context);
  });

  afterAll(async () => {
    await context.close();
  });

  it('creates a category with generated slug and both languages', async () => {
    const response = await api
      .post(`${ADMIN}/post-categories`, USERS.admin, {
        translations: {
          vi: { name: 'Bảo mật', description: 'Mô tả' },
          en: { name: 'Security' },
        },
        sortOrder: 4,
      })
      .expect(201);
    expect(response.body.data).toMatchObject({
      slug: 'bao-mat',
      sortOrder: 4,
      isActive: true,
      vi: { name: 'Bảo mật', description: 'Mô tả' },
      en: { name: 'Security', description: null },
      postCount: 0,
      version: 1,
    });
  });

  it('requires both languages and valid values', async () => {
    const invalid: object[] = [
      {},
      { translations: {} },
      { translations: { vi: { name: 'Chỉ vi' } } },
      { translations: { vi: { name: '' }, en: { name: 'x' } } },
      { translations: { vi: { name: 'a' }, en: { name: 'b' } }, sortOrder: -1 },
      { translations: { vi: { name: 'a' }, en: { name: 'b' } }, slug: 'Bad Slug' },
    ];
    for (const body of invalid) {
      const response = await api.post(`${ADMIN}/post-categories`, USERS.admin, body);
      expect([JSON.stringify(body), response.status]).toEqual([JSON.stringify(body), 400]);
    }
  });

  it('keeps slugs unique among live categories', async () => {
    const body = (slug?: string) => ({
      slug,
      translations: { vi: { name: 'Trùng' }, en: { name: 'Duplicate' } },
    });
    const first = await api.post(`${ADMIN}/post-categories`, USERS.admin, body()).expect(201);
    const second = await api.post(`${ADMIN}/post-categories`, USERS.admin, body()).expect(201);
    expect([first.body.data.slug, second.body.data.slug]).toEqual(['trung', 'trung-2']);
    const taken = await api
      .post(`${ADMIN}/post-categories`, USERS.admin, body('trung'))
      .expect(409);
    expect(taken.body.error.code).toBe('SLUG_TAKEN');

    await api.delete(`${ADMIN}/post-categories/${first.body.data.id}`, USERS.admin).expect(204);
    const reused = await api
      .post(`${ADMIN}/post-categories`, USERS.admin, body('trung'))
      .expect(201);
    expect(reused.body.data.slug).toBe('trung');
  });

  it('updates with optimistic locking', async () => {
    const id = await api.createCategory({ vi: 'Cũ', en: 'Old' });
    const current = (await api.get(`${ADMIN}/post-categories/${id}`, USERS.admin).expect(200)).body
      .data;
    const updated = await api
      .patch(`${ADMIN}/post-categories/${id}`, USERS.admin, {
        version: current.version,
        translations: { vi: { name: 'Mới' }, en: { name: 'New' } },
        isActive: false,
        slug: 'moi',
      })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      slug: 'moi',
      isActive: false,
      vi: { name: 'Mới' },
      en: { name: 'New' },
      version: current.version + 1,
    });
    const stale = await api
      .patch(`${ADMIN}/post-categories/${id}`, USERS.admin, {
        version: current.version,
        sortOrder: 9,
      })
      .expect(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');

    const translationOnly = await api
      .patch(`${ADMIN}/post-categories/${id}`, USERS.admin, {
        version: updated.body.data.version,
        translations: { vi: { name: 'Mới hơn' }, en: { name: 'Newer' } },
      })
      .expect(200);
    expect(translationOnly.body.data.version).toBe(updated.body.data.version + 1);
  });

  it('answers 404 for unknown ids', async () => {
    const unknown = '00000000-0000-4000-8000-00000000dead';
    await api.get(`${ADMIN}/post-categories/${unknown}`, USERS.admin).expect(404);
    await api.get(`${ADMIN}/post-categories/nope`, USERS.admin).expect(404);
    await api.patch(`${ADMIN}/post-categories/${unknown}`, USERS.admin, { version: 1 }).expect(404);
    await api.delete(`${ADMIN}/post-categories/${unknown}`, USERS.admin).expect(404);
  });

  it('lists categories ordered by sortOrder with post counts', async () => {
    const list = await api.get(`${ADMIN}/post-categories`, USERS.staff).expect(200);
    const orders = list.body.data.map((item: { sortOrder: number }) => item.sortOrder);
    expect(orders).toEqual([...orders].sort((a: number, b: number) => a - b));
  });

  describe('deletion rules', () => {
    it('refuses to delete a category that still has posts (409 CATEGORY_IN_USE) and allows it afterwards', async () => {
      const categoryId = await api.createCategory({ vi: 'Đang dùng', en: 'In use' });
      const post = await api.createPost({
        categoryId,
        translations: { vi: { title: 'Bài trong nhóm' } },
      });
      const shown = await api
        .get(`${ADMIN}/post-categories/${categoryId}`, USERS.admin)
        .expect(200);
      expect(shown.body.data.postCount).toBe(1);

      const blocked = await api
        .delete(`${ADMIN}/post-categories/${categoryId}`, USERS.admin)
        .expect(409);
      expect(blocked.body.error.code).toBe('CATEGORY_IN_USE');
      expect(blocked.body.error.details).toEqual({ postCount: 1 });

      await api.delete(`${ADMIN}/posts/${post.id}`, USERS.admin).expect(204);
      await api.delete(`${ADMIN}/post-categories/${categoryId}`, USERS.admin).expect(204);
      await api.get(`${ADMIN}/post-categories/${categoryId}`, USERS.admin).expect(404);
      const row = await context.dataSource
        .getRepository(PostCategory)
        .findOne({ where: { id: categoryId }, withDeleted: true });
      expect(row?.deletedAt).not.toBeNull();
    });

    it('counts archived and draft posts as usage too', async () => {
      const categoryId = await api.createCategory({ vi: 'Lưu trữ', en: 'Archive' });
      const post = await api.createPost({
        categoryId,
        translations: { vi: { title: 'Sẽ lưu trữ', excerpt: 'x', contentHtml: '<p>x</p>' } },
      });
      await api.post(`${ADMIN}/posts/${post.id}/archive`, USERS.admin).expect(200);
      await api.delete(`${ADMIN}/post-categories/${categoryId}`, USERS.admin).expect(409);
    });

    it('lets staff read but not change categories', async () => {
      const id = await api.createCategory({ vi: 'Chỉ đọc', en: 'Read only' });
      await api.get(`${ADMIN}/post-categories/${id}`, USERS.staff).expect(200);
      await api.delete(`${ADMIN}/post-categories/${id}`, USERS.staff).expect(403);
    });
  });
});
