import { CartDto, CartItemDto, CartItemUnavailableReason } from '../dto/cart-response.dto';
import { CartItem } from '../entities/cart-item.entity';
import { Cart } from '../entities/cart.entity';
import { ProductPurchaseInfo } from '../../products/mappers/product-purchase-info';
import { multiplyAmount, sumAmounts, toMinorUnits } from '../../products/utils/money';
import { allowsQuantity } from '../policies/cart-line-rules';

const EMPTY_TOTAL = '0.00';

function toCartItemDto(item: CartItem, info: ProductPurchaseInfo | undefined): CartItemDto {
  const currentPrice =
    info?.prices.find((price) => price.id === item.priceId) ??
    info?.prices.find(
      (price) =>
        price.currency === item.currencySnapshot && price.billingPeriod === item.billingPeriod,
    );

  let unavailableReason: CartItemUnavailableReason | null = null;
  if (!info) unavailableReason = 'PRODUCT_REMOVED';
  else if (!info.isPublished) unavailableReason = 'PRODUCT_UNPUBLISHED';
  else if (info.priceOnRequest) unavailableReason = 'PRICE_ON_REQUEST';
  else if (!currentPrice) unavailableReason = 'PRICE_REMOVED';

  const currentUnitPrice = unavailableReason || !currentPrice ? null : currentPrice.amount;
  const unitPrice = currentUnitPrice ?? item.unitPriceSnapshot;
  return {
    id: item.id,
    productId: item.productId,
    product: info?.card ?? null,
    quantity: item.quantity,
    allowsQuantity: info ? allowsQuantity(info.type) : false,
    billingPeriod: item.billingPeriod,
    currency: item.currencySnapshot,
    snapshotUnitPrice: item.unitPriceSnapshot,
    currentUnitPrice,
    priceChanged:
      currentUnitPrice !== null &&
      toMinorUnits(currentUnitPrice) !== toMinorUnits(item.unitPriceSnapshot),
    unavailable: unavailableReason !== null,
    unavailableReason,
    unitPrice,
    lineTotal: multiplyAmount(unitPrice, item.quantity),
    addedAt: item.addedAt,
  };
}

export function toCartDto(
  cart: Cart | null,
  items: readonly CartItem[],
  infos: ReadonlyMap<string, ProductPurchaseInfo>,
): CartDto {
  const lines = [...items]
    .sort(
      (left, right) =>
        left.addedAt.getTime() - right.addedAt.getTime() || left.id.localeCompare(right.id),
    )
    .map((item) => toCartItemDto(item, infos.get(item.productId)));
  const available = lines.filter((line) => !line.unavailable);
  return {
    id: cart?.id ?? null,
    currency: cart?.currency ?? null,
    items: lines,
    itemCount: lines.length,
    totalQuantity: available.reduce((sum, line) => sum + line.quantity, 0),
    total: available.length > 0 ? sumAmounts(available.map((line) => line.lineTotal)) : EMPTY_TOTAL,
    hasUnavailableItems: lines.some((line) => line.unavailable),
    hasPriceChanges: lines.some((line) => line.priceChanged),
  };
}
