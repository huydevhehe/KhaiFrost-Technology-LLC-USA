import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Locale } from '../../../common/enums/locale.enum';
import { ApplicationException } from '../../../common/exceptions/application.exception';
import { conflict, notFound } from '../../../common/exceptions/exception.factories';
import { ProductPurchaseInfo } from '../../products/mappers/product-purchase-info';
import { ProductsService } from '../../products/services/products.service';
import { businessRuleViolation } from '../../products/utils/business-rule-violation';
import {
  AddCartItemDto,
  MAX_DISTINCT_ITEMS,
  MAX_ITEM_QUANTITY,
  MergeCartDto,
  UpdateCartItemDto,
} from '../dto/cart-request.dto';
import {
  CartDto,
  CartMergeResultDto,
  MergedCartLineDto,
  SkippedCartLineDto,
} from '../dto/cart-response.dto';
import { CartItem } from '../entities/cart-item.entity';
import { Cart } from '../entities/cart.entity';
import { toCartDto } from '../mappers/cart-view.mapper';
import {
  allowsQuantity,
  assertPurchasable,
  CartLineRequest,
  resolveQuantity,
  selectPrice,
} from '../policies/cart-line-rules';

interface LockedCart {
  cart: Cart;
  items: CartItem[];
}

type LineMode = 'add' | 'merge';

@Injectable()
export class CartService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Cart) private readonly carts: Repository<Cart>,
    @InjectRepository(CartItem) private readonly items: Repository<CartItem>,
    private readonly products: ProductsService,
  ) {}

  async getCart(userId: string, locale: Locale): Promise<CartDto> {
    const cart = await this.carts.findOne({ where: { userId } });
    if (!cart) return toCartDto(null, [], new Map());
    const items = await this.items.find({ where: { cartId: cart.id } });
    const infos = await this.products.getPurchaseInfoByIds(
      items.map((item) => item.productId),
      locale,
    );
    return toCartDto(cart, items, infos);
  }

  async addItem(userId: string, dto: AddCartItemDto, locale: Locale): Promise<CartDto> {
    const infos = await this.products.getPurchaseInfoByIds([dto.productId], locale);
    const info = assertPurchasable(infos.get(dto.productId));
    await this.withLockedCart(userId, async (manager, locked) => {
      await this.applyLine(manager, locked, info, dto, 'add');
    });
    return this.getCart(userId, locale);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
    locale: Locale,
  ): Promise<CartDto> {
    await this.withLockedCart(userId, async (manager, locked) => {
      const item = this.findItem(locked, itemId);
      const infos = await this.products.getPurchaseInfoByIds([item.productId], locale);
      const info = infos.get(item.productId);
      if (!info?.isPurchasable) {
        throw conflict(
          'CART_ITEM_UNAVAILABLE',
          'This product is no longer available; remove it from your cart',
        );
      }
      item.quantity = resolveQuantity(info.type, dto.quantity);
      await manager.update(CartItem, { id: item.id }, { quantity: item.quantity });
    });
    return this.getCart(userId, locale);
  }

  async removeItem(userId: string, itemId: string, locale: Locale): Promise<CartDto> {
    await this.withLockedCart(userId, async (manager, locked) => {
      const item = this.findItem(locked, itemId);
      await manager.delete(CartItem, { id: item.id });
      locked.items = locked.items.filter((candidate) => candidate.id !== item.id);
    });
    return this.getCart(userId, locale);
  }

  async clear(userId: string, locale: Locale): Promise<CartDto> {
    await this.withLockedCart(userId, async (manager, locked) => {
      await manager.delete(CartItem, { cartId: locked.cart.id });
      locked.items = [];
    });
    return this.getCart(userId, locale);
  }

  // Idempotent: quantities merge with max(), so replaying the same guest cart changes nothing
  async merge(userId: string, dto: MergeCartDto, locale: Locale): Promise<CartMergeResultDto> {
    const infos = await this.products.getPurchaseInfoByIds(
      dto.items.map((line) => line.productId),
      locale,
    );
    const merged: MergedCartLineDto[] = [];
    const skipped: SkippedCartLineDto[] = [];

    await this.withLockedCart(userId, async (manager, locked) => {
      for (const line of dto.items) {
        try {
          const info = assertPurchasable(infos.get(line.productId));
          merged.push(await this.applyLine(manager, locked, info, line, 'merge'));
        } catch (error) {
          if (!(error instanceof ApplicationException)) throw error;
          skipped.push({
            productId: line.productId,
            reason: error.code === 'NOT_FOUND' ? 'PRODUCT_UNAVAILABLE' : error.code,
            message: error.message,
          });
        }
      }
    });
    return { cart: await this.getCart(userId, locale), merged, skipped };
  }

  // Serialises every change of one user's cart, so the item limit and the single currency hold under concurrency
  private async withLockedCart(
    userId: string,
    work: (manager: EntityManager, locked: LockedCart) => Promise<void>,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(Cart)
        .values({ userId })
        .orIgnore()
        .execute();
      const cart = await manager
        .createQueryBuilder(Cart, 'cart')
        .setLock('pessimistic_write')
        .where('cart.userId = :userId', { userId })
        .getOneOrFail();
      const locked: LockedCart = {
        cart,
        items: await manager.find(CartItem, { where: { cartId: cart.id } }),
      };

      await work(manager, locked);

      const currency = locked.items.length > 0 ? locked.cart.currency : null;
      // Always written so updatedAt moves with every change
      await manager.update(Cart, { id: cart.id }, { currency });
    });
  }

  private findItem(locked: LockedCart, itemId: string): CartItem {
    const item = locked.items.find((candidate) => candidate.id === itemId);
    if (!item) throw notFound('Cart item');
    return item;
  }

  private async applyLine(
    manager: EntityManager,
    locked: LockedCart,
    info: ProductPurchaseInfo,
    request: CartLineRequest,
    mode: LineMode,
  ): Promise<MergedCartLineDto> {
    const currentCurrency = locked.items.length > 0 ? locked.cart.currency : null;
    const price = selectPrice(info, currentCurrency, request);
    const requested = resolveQuantity(info.type, request.quantity);
    const existing = locked.items.find(
      (item) => item.productId === info.id && item.billingPeriod === price.billingPeriod,
    );

    if (existing) {
      let quantity = 1;
      if (allowsQuantity(info.type)) {
        quantity =
          mode === 'add' ? existing.quantity + requested : Math.max(existing.quantity, requested);
        if (quantity > MAX_ITEM_QUANTITY) {
          if (mode === 'add') {
            throw businessRuleViolation(
              'CART_QUANTITY_LIMIT',
              `You can order at most ${MAX_ITEM_QUANTITY} of the same item`,
              { limit: MAX_ITEM_QUANTITY },
            );
          }
          quantity = MAX_ITEM_QUANTITY;
        }
      }
      // Re-adding refreshes the snapshot, which is how a customer accepts a price change
      const refreshed = {
        quantity,
        priceId: price.id,
        unitPriceSnapshot: price.amount,
        currencySnapshot: price.currency,
      };
      await manager.update(CartItem, { id: existing.id }, refreshed);
      Object.assign(existing, refreshed);
      return { productId: info.id, billingPeriod: existing.billingPeriod, quantity };
    }

    if (locked.items.length >= MAX_DISTINCT_ITEMS) {
      throw businessRuleViolation(
        'CART_ITEM_LIMIT',
        `A cart can hold at most ${MAX_DISTINCT_ITEMS} different items`,
        { limit: MAX_DISTINCT_ITEMS },
      );
    }
    const item = await manager.save(
      manager.create(CartItem, {
        cartId: locked.cart.id,
        productId: info.id,
        priceId: price.id,
        quantity: requested,
        unitPriceSnapshot: price.amount,
        currencySnapshot: price.currency,
        billingPeriod: price.billingPeriod,
      }),
    );
    locked.items.push(item);
    locked.cart.currency = price.currency;
    return { productId: info.id, billingPeriod: item.billingPeriod, quantity: item.quantity };
  }
}
