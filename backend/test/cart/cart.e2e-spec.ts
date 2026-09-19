import request from 'supertest';
import { PublicationStatus } from '../../src/common/enums/publication-status.enum';
import { CartItem } from '../../src/modules/cart/entities/cart-item.entity';
import { Cart } from '../../src/modules/cart/entities/cart.entity';
import { CartModule } from '../../src/modules/cart/cart.module';
import { ProductPrice } from '../../src/modules/products/entities/product-price.entity';
import { Product } from '../../src/modules/products/entities/product.entity';
import { BillingPeriod } from '../../src/modules/products/enums/billing-period.enum';
import { Currency } from '../../src/modules/products/enums/currency.enum';
import { ProductType } from '../../src/modules/products/enums/product-type.enum';
import {
  createModuleTestingContext,
  ModuleTestingContext,
} from '../support/create-module-testing-context';
import {
  as,
  PRODUCT_ENTITIES,
  SeedPrice,
  seedProduct,
  TEST_USERS,
  usdOneTime,
} from '../products/product-test-helpers';

const vndOneTime = (amount = '2500000'): SeedPrice => ({
  currency: Currency.VND,
  amount,
  billingPeriod: BillingPeriod.ONE_TIME,
});

const hostingPrices: SeedPrice[] = [
  {
    currency: Currency.USD,
    amount: '10.10',
    billingPeriod: BillingPeriod.MONTHLY,
    isDefault: true,
  },
  { currency: Currency.USD, amount: '100.00', billingPeriod: BillingPeriod.YEARLY },
];

interface CartBody {
  currency: string | null;
  items: {
    id: string;
    productId: string;
    quantity: number;
    billingPeriod: string;
    unavailable: boolean;
    unavailableReason: string | null;
    priceChanged: boolean;
    snapshotUnitPrice: string;
    currentUnitPrice: string | null;
    lineTotal: string;
    product: { name: string } | null;
  }[];
  itemCount: number;
  total: string;
  hasUnavailableItems: boolean;
  hasPriceChanges: boolean;
}

describe('Cart API', () => {
  let context: ModuleTestingContext;
  const server = () => context.app.getHttpServer();
  const { customer, otherCustomer } = TEST_USERS;
  const url = (path = '') => `/api/v1/me/cart${path}`;
  let userSequence = 0x100;

  // Every test gets a fresh customer so carts never interfere
  const newUser = () => ({
    id: `00000000-0000-4000-8000-${(userSequence++).toString(16).padStart(12, '0')}`,
    role: customer.role,
  });

  beforeAll(async () => {
    context = await createModuleTestingContext({
      entities: [...PRODUCT_ENTITIES, Cart, CartItem],
      imports: [CartModule],
    });
  });

  afterAll(async () => {
    await context.close();
  });

  const add = (user: ReturnType<typeof newUser>, body: Record<string, unknown>) =>
    request(server()).post(url('/items')).set(as(user)).send(body);
  const read = async (user: ReturnType<typeof newUser>, query = ''): Promise<CartBody> =>
    (await request(server()).get(url(query)).set(as(user)).expect(200)).body.data;

  it('requires authentication on every route', async () => {
    await request(server()).get(url()).expect(401);
    await request(server()).post(url('/items')).send({}).expect(401);
    await request(server()).patch(url('/items/00000000-0000-4000-8000-000000000001')).expect(401);
    await request(server()).delete(url('/items/00000000-0000-4000-8000-000000000001')).expect(401);
    await request(server()).delete(url()).expect(401);
    await request(server()).post(url('/merge')).send({ items: [] }).expect(401);
  });

  it('returns an empty cart for a new customer', async () => {
    const cart = await read(newUser());
    expect(cart).toMatchObject({ currency: null, items: [], itemCount: 0, total: '0.00' });
  });

  describe('adding items', () => {
    it('adds a source code product, forces quantity 1 and is idempotent', async () => {
      const user = newUser();
      const { product } = await seedProduct(context.dataSource, {
        prices: [usdOneTime('99.99')],
      });
      await add(user, { productId: product.id, quantity: 5 }).expect(201);
      const again = await add(user, { productId: product.id, quantity: 3 }).expect(201);
      const cart = again.body.data as CartBody;
      expect(cart.items).toHaveLength(1);
      expect(cart.items[0]).toMatchObject({
        quantity: 1,
        lineTotal: '99.99',
        billingPeriod: 'one_time',
      });
      expect(cart).toMatchObject({ currency: 'USD', total: '99.99' });
    });

    it('forces quantity 1 for live demos too', async () => {
      const user = newUser();
      const { product } = await seedProduct(context.dataSource, {
        type: ProductType.LIVE_DEMO,
        demoUrl: 'https://demo.example.com',
      });
      const response = await add(user, { productId: product.id, quantity: 9 }).expect(201);
      expect(response.body.data.items[0].quantity).toBe(1);
    });

    it('requires a billing period for hosting plans and honours quantity', async () => {
      const user = newUser();
      const { product } = await seedProduct(context.dataSource, {
        type: ProductType.HOSTING_PLAN,
        prices: hostingPrices,
      });
      const missing = await add(user, { productId: product.id, quantity: 2 }).expect(400);
      expect(missing.body.error.code).toBe('VALIDATION_FAILED');
      await add(user, {
        productId: product.id,
        quantity: 2,
        billingPeriod: 'one_time',
      }).expect(400);

      const added = await add(user, {
        productId: product.id,
        quantity: 3,
        billingPeriod: 'monthly',
      }).expect(201);
      expect(added.body.data.items[0]).toMatchObject({
        quantity: 3,
        billingPeriod: 'monthly',
        snapshotUnitPrice: '10.10',
        lineTotal: '30.30',
      });

      const more = await add(user, {
        productId: product.id,
        quantity: 2,
        billingPeriod: 'monthly',
      }).expect(201);
      expect(more.body.data.items[0].quantity).toBe(5);

      const yearly = await add(user, {
        productId: product.id,
        billingPeriod: 'yearly',
      }).expect(201);
      expect(yearly.body.data.items).toHaveLength(2);
      expect(yearly.body.data.total).toBe('150.50');
    });

    it('rejects quantity above 99 and invalid bodies', async () => {
      const user = newUser();
      const { product } = await seedProduct(context.dataSource, {
        type: ProductType.HOSTING_PLAN,
        prices: hostingPrices,
      });
      await add(user, { productId: product.id, quantity: 100, billingPeriod: 'monthly' }).expect(
        400,
      );
      await add(user, { productId: product.id, quantity: 0, billingPeriod: 'monthly' }).expect(400);
      await add(user, { productId: 'nope' }).expect(400);
      await add(user, { productId: product.id, currency: 'EUR' }).expect(400);
      await add(user, { productId: product.id, billingPeriod: 'monthly', extra: 1 }).expect(400);

      await add(user, { productId: product.id, quantity: 60, billingPeriod: 'monthly' }).expect(
        201,
      );
      const over = await add(user, {
        productId: product.id,
        quantity: 60,
        billingPeriod: 'monthly',
      }).expect(422);
      expect(over.body.error.code).toBe('CART_QUANTITY_LIMIT');
    });

    it('only accepts published products (404 otherwise)', async () => {
      const user = newUser();
      const draft = await seedProduct(context.dataSource, { status: PublicationStatus.DRAFT });
      const scheduled = await seedProduct(context.dataSource, {
        publishedAt: new Date(Date.now() + 3_600_000),
      });
      const deleted = await seedProduct(context.dataSource, { deletedAt: new Date() });
      for (const item of [draft, scheduled, deleted]) {
        await add(user, { productId: item.product.id }).expect(404);
      }
      await add(user, { productId: '00000000-0000-4000-8000-00000000dead' }).expect(404);
    });

    it('refuses price-on-request products with a contact-form hint', async () => {
      const user = newUser();
      const { product } = await seedProduct(context.dataSource, { priceOnRequest: true });
      const response = await add(user, { productId: product.id }).expect(422);
      expect(response.body.error.code).toBe('PRICE_ON_REQUEST');
      expect(response.body.error.message).toMatch(/contact/i);
      expect(response.body.error.details).toEqual({ hint: 'contact_form' });
    });

    it('enforces one currency per cart (CART_CURRENCY_MISMATCH)', async () => {
      const user = newUser();
      const usdOnly = await seedProduct(context.dataSource, { prices: [usdOneTime('20.00')] });
      const vndOnly = await seedProduct(context.dataSource, { prices: [vndOneTime()] });
      const both = await seedProduct(context.dataSource, {
        prices: [usdOneTime('30.00'), vndOneTime('700000')],
      });

      await add(user, { productId: usdOnly.product.id }).expect(201);
      const mismatch = await add(user, { productId: vndOnly.product.id }).expect(409);
      expect(mismatch.body.error.code).toBe('CART_CURRENCY_MISMATCH');
      const explicit = await add(user, { productId: both.product.id, currency: 'VND' }).expect(409);
      expect(explicit.body.error.code).toBe('CART_CURRENCY_MISMATCH');
      const ok = await add(user, { productId: both.product.id }).expect(201);
      expect(ok.body.data).toMatchObject({ currency: 'USD', total: '50.00' });
      expect(ok.body.data.items).toHaveLength(2);
    });

    it('lets an empty cart pick a new currency after it was emptied', async () => {
      const user = newUser();
      const usdOnly = await seedProduct(context.dataSource, { prices: [usdOneTime()] });
      const vndOnly = await seedProduct(context.dataSource, { prices: [vndOneTime()] });
      await add(user, { productId: usdOnly.product.id }).expect(201);
      const emptied = await request(server()).delete(url()).set(as(user)).expect(200);
      expect(emptied.body.data).toMatchObject({ currency: null, items: [], total: '0.00' });
      const vnd = await add(user, { productId: vndOnly.product.id }).expect(201);
      expect(vnd.body.data).toMatchObject({ currency: 'VND', total: '2500000.00' });

      const first = vnd.body.data.items[0].id;
      const removed = await request(server())
        .delete(url(`/items/${first}`))
        .set(as(user))
        .expect(200);
      expect(removed.body.data.currency).toBeNull();
      await add(user, { productId: usdOnly.product.id }).expect(201);
    });

    it('starts an empty cart in the requested currency', async () => {
      const user = newUser();
      const both = await seedProduct(context.dataSource, {
        prices: [usdOneTime('30.00'), vndOneTime('700000')],
      });
      const response = await add(user, { productId: both.product.id, currency: 'VND' }).expect(201);
      expect(response.body.data).toMatchObject({ currency: 'VND', total: '700000.00' });
    });

    it('caps a cart at 50 distinct items', async () => {
      const user = newUser();
      const products = [];
      for (let index = 0; index < 51; index++) {
        products.push(await seedProduct(context.dataSource));
      }
      for (const { product } of products.slice(0, 50)) {
        await add(user, { productId: product.id }).expect(201);
      }
      const blocked = await add(user, { productId: products[50].product.id }).expect(422);
      expect(blocked.body.error.code).toBe('CART_ITEM_LIMIT');
      await add(user, { productId: products[0].product.id }).expect(201);
    });
  });

  describe('updating and removing', () => {
    it('changes hosting quantity, keeps source code at 1 and isolates carts per user', async () => {
      const user = newUser();
      const hosting = await seedProduct(context.dataSource, {
        type: ProductType.HOSTING_PLAN,
        prices: hostingPrices,
      });
      const code = await seedProduct(context.dataSource);
      await add(user, { productId: hosting.product.id, billingPeriod: 'monthly' }).expect(201);
      const cart = (await add(user, { productId: code.product.id }).expect(201)).body
        .data as CartBody;
      const hostingLine = cart.items.find((item) => item.productId === hosting.product.id)!;
      const codeLine = cart.items.find((item) => item.productId === code.product.id)!;

      const updated = await request(server())
        .patch(url(`/items/${hostingLine.id}`))
        .set(as(user))
        .send({ quantity: 4 })
        .expect(200);
      expect(
        updated.body.data.items.find((item: { id: string }) => item.id === hostingLine.id).quantity,
      ).toBe(4);

      const forced = await request(server())
        .patch(url(`/items/${codeLine.id}`))
        .set(as(user))
        .send({ quantity: 7 })
        .expect(200);
      expect(
        forced.body.data.items.find((item: { id: string }) => item.id === codeLine.id).quantity,
      ).toBe(1);

      await request(server())
        .patch(url(`/items/${hostingLine.id}`))
        .set(as(user))
        .send({ quantity: 0 })
        .expect(400);
      await request(server())
        .patch(url(`/items/${hostingLine.id}`))
        .set(as(user))
        .send({ quantity: 100 })
        .expect(400);
      await request(server())
        .patch(url(`/items/${hostingLine.id}`))
        .set(as(user))
        .send({})
        .expect(400);

      await request(server())
        .patch(url(`/items/${hostingLine.id}`))
        .set(as(otherCustomer))
        .send({ quantity: 2 })
        .expect(404);
      await request(server())
        .delete(url(`/items/${hostingLine.id}`))
        .set(as(otherCustomer))
        .expect(404);

      const removed = await request(server())
        .delete(url(`/items/${hostingLine.id}`))
        .set(as(user))
        .expect(200);
      expect(removed.body.data.items).toHaveLength(1);
      await request(server())
        .delete(url(`/items/${hostingLine.id}`))
        .set(as(user))
        .expect(404);
      await request(server())
        .patch(url('/items/not-a-uuid'))
        .set(as(user))
        .send({ quantity: 1 })
        .expect(400);
    });
  });

  describe('price and availability flags', () => {
    it('flags price changes and keeps the snapshot until the item is re-added', async () => {
      const user = newUser();
      const { product, prices } = await seedProduct(context.dataSource, {
        prices: [usdOneTime('100.00')],
      });
      await add(user, { productId: product.id }).expect(201);

      await context.dataSource
        .getRepository(ProductPrice)
        .update({ id: prices[0].id }, { amount: '120.00' });
      const changed = await read(user);
      expect(changed.hasPriceChanges).toBe(true);
      expect(changed.items[0]).toMatchObject({
        priceChanged: true,
        snapshotUnitPrice: '100.00',
        currentUnitPrice: '120.00',
        lineTotal: '120.00',
        unavailable: false,
      });
      expect(changed.total).toBe('120.00');

      const refreshed = (await add(user, { productId: product.id }).expect(201)).body
        .data as CartBody;
      expect(refreshed.hasPriceChanges).toBe(false);
      expect(refreshed.items[0].snapshotUnitPrice).toBe('120.00');
    });

    it('flags unpublished, archived, removed and price-on-request items and excludes them from the total', async () => {
      const user = newUser();
      const stays = await seedProduct(context.dataSource, { prices: [usdOneTime('10.00')] });
      const unpublished = await seedProduct(context.dataSource, {
        prices: [usdOneTime('20.00')],
        names: { vi: 'Se bi go', en: 'Will be unpublished' },
      });
      const deleted = await seedProduct(context.dataSource, { prices: [usdOneTime('30.00')] });
      const onRequest = await seedProduct(context.dataSource, { prices: [usdOneTime('40.00')] });
      for (const item of [stays, unpublished, deleted, onRequest]) {
        await add(user, { productId: item.product.id }).expect(201);
      }

      const products = context.dataSource.getRepository(Product);
      await products.update({ id: unpublished.product.id }, { status: PublicationStatus.DRAFT });
      await products.softDelete({ id: deleted.product.id });
      await products.update({ id: onRequest.product.id }, { priceOnRequest: true });

      const cart = await read(user, '?locale=en');
      const byProduct = new Map(cart.items.map((item) => [item.productId, item]));
      expect(byProduct.get(stays.product.id)).toMatchObject({ unavailable: false });
      expect(byProduct.get(unpublished.product.id)).toMatchObject({
        unavailable: true,
        unavailableReason: 'PRODUCT_UNPUBLISHED',
        lineTotal: '20.00',
        product: { name: 'Will be unpublished' },
      });
      expect(byProduct.get(deleted.product.id)).toMatchObject({
        unavailable: true,
        unavailableReason: 'PRODUCT_REMOVED',
        product: null,
      });
      expect(byProduct.get(onRequest.product.id)).toMatchObject({
        unavailable: true,
        unavailableReason: 'PRICE_ON_REQUEST',
      });
      expect(cart.hasUnavailableItems).toBe(true);
      expect(cart.total).toBe('10.00');

      const patched = await request(server())
        .patch(url(`/items/${byProduct.get(unpublished.product.id)!.id}`))
        .set(as(user))
        .send({ quantity: 2 })
        .expect(409);
      expect(patched.body.error.code).toBe('CART_ITEM_UNAVAILABLE');

      const removed = await request(server())
        .delete(url(`/items/${byProduct.get(unpublished.product.id)!.id}`))
        .set(as(user))
        .expect(200);
      expect(removed.body.data.items).toHaveLength(3);
    });

    it('follows a price row that was replaced by billing period and marks a removed price', async () => {
      const user = newUser();
      const { product, prices } = await seedProduct(context.dataSource, {
        type: ProductType.HOSTING_PLAN,
        prices: hostingPrices,
      });
      await add(user, { productId: product.id, billingPeriod: 'yearly' }).expect(201);
      const yearly = prices.find((price) => price.billingPeriod === 'yearly')!;
      await context.dataSource.getRepository(ProductPrice).delete({ id: yearly.id });
      await context.dataSource.getRepository(ProductPrice).insert({
        productId: product.id,
        currency: Currency.USD,
        amount: '90.00',
        billingPeriod: BillingPeriod.YEARLY,
        isDefault: false,
      });
      const replaced = await read(user);
      expect(replaced.items[0]).toMatchObject({ currentUnitPrice: '90.00', priceChanged: true });

      await context.dataSource
        .getRepository(ProductPrice)
        .delete({ productId: product.id, billingPeriod: BillingPeriod.YEARLY });
      const removed = await read(user);
      expect(removed.items[0]).toMatchObject({
        unavailable: true,
        unavailableReason: 'PRICE_REMOVED',
      });
    });
  });

  describe('merge', () => {
    it('merges a guest cart idempotently and reports skipped lines', async () => {
      const user = newUser();
      const code = await seedProduct(context.dataSource, { prices: [usdOneTime('10.00')] });
      const hosting = await seedProduct(context.dataSource, {
        type: ProductType.HOSTING_PLAN,
        prices: hostingPrices,
      });
      const draft = await seedProduct(context.dataSource, { status: PublicationStatus.DRAFT });
      const onRequest = await seedProduct(context.dataSource, { priceOnRequest: true });
      const vndOnly = await seedProduct(context.dataSource, { prices: [vndOneTime()] });

      const payload = {
        items: [
          { productId: code.product.id, quantity: 3 },
          { productId: hosting.product.id, quantity: 2, billingPeriod: 'monthly' },
          { productId: hosting.product.id, quantity: 1 },
          { productId: draft.product.id },
          { productId: onRequest.product.id },
          { productId: vndOnly.product.id },
          { productId: '00000000-0000-4000-8000-00000000dead' },
        ],
      };

      const first = await request(server())
        .post(url('/merge'))
        .set(as(user))
        .send(payload)
        .expect(200);
      const result = first.body.data as {
        cart: CartBody;
        merged: { productId: string; quantity: number }[];
        skipped: { productId: string; reason: string }[];
      };
      expect(result.merged).toEqual([
        { productId: code.product.id, billingPeriod: 'one_time', quantity: 1 },
        { productId: hosting.product.id, billingPeriod: 'monthly', quantity: 2 },
      ]);
      const reasons = new Map(result.skipped.map((line) => [line.productId, line.reason]));
      expect(reasons.get(hosting.product.id)).toBe('VALIDATION_FAILED');
      expect(reasons.get(draft.product.id)).toBe('PRODUCT_UNAVAILABLE');
      expect(reasons.get(onRequest.product.id)).toBe('PRICE_ON_REQUEST');
      expect(reasons.get(vndOnly.product.id)).toBe('CART_CURRENCY_MISMATCH');
      expect(reasons.get('00000000-0000-4000-8000-00000000dead')).toBe('PRODUCT_UNAVAILABLE');
      expect(result.cart.items).toHaveLength(2);
      expect(result.cart.total).toBe('30.20');

      const second = await request(server())
        .post(url('/merge'))
        .set(as(user))
        .send(payload)
        .expect(200);
      expect(second.body.data.cart.items).toHaveLength(2);
      expect(second.body.data.cart.total).toBe('30.20');
      const quantities = second.body.data.cart.items
        .map((item: { quantity: number }) => item.quantity)
        .sort();
      expect(quantities).toEqual([1, 2]);
      const rows = await context.dataSource.getRepository(CartItem).count();
      expect(rows).toBeGreaterThan(0);
    });

    it('keeps the larger quantity and never lowers an existing line', async () => {
      const user = newUser();
      const hosting = await seedProduct(context.dataSource, {
        type: ProductType.HOSTING_PLAN,
        prices: hostingPrices,
      });
      await add(user, {
        productId: hosting.product.id,
        quantity: 5,
        billingPeriod: 'monthly',
      }).expect(201);
      const lower = await request(server())
        .post(url('/merge'))
        .set(as(user))
        .send({ items: [{ productId: hosting.product.id, quantity: 2, billingPeriod: 'monthly' }] })
        .expect(200);
      expect(lower.body.data.cart.items[0].quantity).toBe(5);
      const higher = await request(server())
        .post(url('/merge'))
        .set(as(user))
        .send({ items: [{ productId: hosting.product.id, quantity: 8, billingPeriod: 'monthly' }] })
        .expect(200);
      expect(higher.body.data.cart.items[0].quantity).toBe(8);
    });

    it('reports lines beyond the 50 item limit as skipped', async () => {
      const user = newUser();
      const products = [];
      for (let index = 0; index < 51; index++) products.push(await seedProduct(context.dataSource));
      const response = await request(server())
        .post(url('/merge'))
        .set(as(user))
        .send({ items: products.map(({ product }) => ({ productId: product.id })) })
        .expect(200);
      expect(response.body.data.cart.itemCount).toBe(50);
      expect(response.body.data.skipped).toEqual([
        expect.objectContaining({ productId: products[50].product.id, reason: 'CART_ITEM_LIMIT' }),
      ]);
    });

    it('validates the merge body', async () => {
      const user = newUser();
      await request(server()).post(url('/merge')).set(as(user)).send({}).expect(400);
      await request(server())
        .post(url('/merge'))
        .set(as(user))
        .send({ items: [{ productId: 'x' }] })
        .expect(400);
      await request(server()).post(url('/merge')).set(as(user)).send({ items: [] }).expect(200);
    });
  });
});
