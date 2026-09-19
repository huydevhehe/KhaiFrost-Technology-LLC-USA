import request from 'supertest';
import { PublicationStatus } from '../../src/common/enums/publication-status.enum';
import { Favorite } from '../../src/modules/favorites/entities/favorite.entity';
import { FavoritesModule } from '../../src/modules/favorites/favorites.module';
import { FavoritesService } from '../../src/modules/favorites/services/favorites.service';
import { Product } from '../../src/modules/products/entities/product.entity';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import { as, PRODUCT_ENTITIES, seedProduct, TEST_USERS } from '../products/product-test-helpers';

describe('Favorites API', () => {
  let context: ModuleTestingContext;
  const server = () => context.app.getHttpServer();
  const { customer, otherCustomer, staff } = TEST_USERS;
  const url = (path = '') => `/api/v1/me/favorites${path}`;

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [...PRODUCT_ENTITIES, Favorite],
      imports: [FavoritesModule],
    });
  });

  afterAll(async () => {
    await context.close();
  });

  it('requires authentication', async () => {
    const { product } = await seedProduct(context.dataSource);
    await request(server()).get(url()).expect(401);
    await request(server()).get(url('/ids')).expect(401);
    await request(server())
      .put(url(`/${product.id}`))
      .expect(401);
    await request(server())
      .delete(url(`/${product.id}`))
      .expect(401);
  });

  it('adds and removes idempotently', async () => {
    const { product } = await seedProduct(context.dataSource);
    for (let attempt = 0; attempt < 2; attempt++) {
      const added = await request(server())
        .put(url(`/${product.id}`))
        .set(as(customer))
        .expect(200);
      expect(added.body.data).toEqual({ productId: product.id, favorited: true });
    }
    const rows = await context.dataSource
      .getRepository(Favorite)
      .count({ where: { userId: customer.id, productId: product.id } });
    expect(rows).toBe(1);

    const ids = await request(server()).get(url('/ids')).set(as(customer)).expect(200);
    expect(ids.body.data.productIds).toContain(product.id);
    const otherIds = await request(server()).get(url('/ids')).set(as(otherCustomer)).expect(200);
    expect(otherIds.body.data.productIds).not.toContain(product.id);

    for (let attempt = 0; attempt < 2; attempt++) {
      const removed = await request(server())
        .delete(url(`/${product.id}`))
        .set(as(customer))
        .expect(200);
      expect(removed.body.data).toEqual({ productId: product.id, favorited: false });
    }
    const after = await request(server()).get(url('/ids')).set(as(customer)).expect(200);
    expect(after.body.data.productIds).not.toContain(product.id);
  });

  it('only accepts published products and valid ids', async () => {
    const draft = await seedProduct(context.dataSource, { status: PublicationStatus.DRAFT });
    const scheduled = await seedProduct(context.dataSource, {
      publishedAt: new Date(Date.now() + 3_600_000),
    });
    await request(server())
      .put(url(`/${draft.product.id}`))
      .set(as(customer))
      .expect(404);
    await request(server())
      .put(url(`/${scheduled.product.id}`))
      .set(as(customer))
      .expect(404);
    await request(server())
      .put(url('/00000000-0000-4000-8000-00000000dead'))
      .set(as(customer))
      .expect(404);
    await request(server()).put(url('/not-a-uuid')).set(as(customer)).expect(400);
  });

  it('works for staff accounts too (any authenticated user)', async () => {
    const { product } = await seedProduct(context.dataSource);
    await request(server())
      .put(url(`/${product.id}`))
      .set(as(staff))
      .expect(200);
  });

  it('lists cards in the requested locale, newest favourite first, and hides unpublished ones', async () => {
    const first = await seedProduct(context.dataSource, { names: { vi: 'Mot', en: 'One' } });
    const second = await seedProduct(context.dataSource, { names: { vi: 'Hai', en: 'Two' } });
    const third = await seedProduct(context.dataSource, { names: { vi: 'Ba', en: 'Three' } });
    const user = { id: '00000000-0000-4000-8000-0000000000c9', role: customer.role };
    for (const item of [first, second, third]) {
      await request(server())
        .put(url(`/${item.product.id}`))
        .set(as(user))
        .expect(200);
    }

    const list = await request(server()).get(url('?locale=en')).set(as(user)).expect(200);
    expect(list.body.data.map((card: { name: string }) => card.name)).toEqual([
      'Three',
      'Two',
      'One',
    ]);
    expect(list.body.data[0]).toHaveProperty('prices');
    expect(list.body.meta).toMatchObject({ total: 3, page: 1 });

    await context.dataSource
      .getRepository(Product)
      .update({ id: second.product.id }, { status: PublicationStatus.ARCHIVED });
    const afterArchive = await request(server()).get(url('?pageSize=2')).set(as(user)).expect(200);
    expect(afterArchive.body.data.map((card: { name: string }) => card.name)).toEqual([
      'Ba',
      'Mot',
    ]);
    expect(afterArchive.body.meta.total).toBe(2);
    const ids = await request(server()).get(url('/ids')).set(as(user)).expect(200);
    expect(ids.body.data.productIds).toEqual([third.product.id, first.product.id]);

    const paged = await request(server()).get(url('?pageSize=1&page=2')).set(as(user)).expect(200);
    expect(paged.body.data).toHaveLength(1);
    expect(paged.body.meta.totalPages).toBe(2);
    await request(server()).get(url('?locale=xx')).set(as(user)).expect(400);
  });

  it('caps favourites at 500 per user', async () => {
    const user = { id: '00000000-0000-4000-8000-0000000000ca', role: customer.role };
    const { product } = await seedProduct(context.dataSource);
    const extra = await seedProduct(context.dataSource);
    const repository = context.dataSource.getRepository(Favorite);
    await repository.insert(
      Array.from({ length: 499 }, (_, index) => ({
        userId: user.id,
        productId: `11111111-1111-4111-8111-${index.toString(16).padStart(12, '0')}`,
      })),
    );
    await request(server())
      .put(url(`/${product.id}`))
      .set(as(user))
      .expect(200);
    const blocked = await request(server())
      .put(url(`/${extra.product.id}`))
      .set(as(user))
      .expect(422);
    expect(blocked.body.error.code).toBe('FAVORITES_LIMIT_REACHED');
    await request(server())
      .put(url(`/${product.id}`))
      .set(as(user))
      .expect(200);
  });

  it('counts favourites per product for analytics', async () => {
    const { product } = await seedProduct(context.dataSource);
    const users = [customer, otherCustomer];
    for (const user of users) {
      await request(server())
        .put(url(`/${product.id}`))
        .set(as(user))
        .expect(200);
    }
    const counts = await context.moduleRef.get(FavoritesService).countByProduct([product.id]);
    expect(counts.get(product.id)).toBe(2);
  });
});
