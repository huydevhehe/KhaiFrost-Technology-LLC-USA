import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { ProductCardDto } from '../dto/product-response.dto';
import { ProductPrice } from '../entities/product-price.entity';
import { Product } from '../entities/product.entity';
import { BillingPeriod } from '../enums/billing-period.enum';
import { Currency } from '../enums/currency.enum';
import { ProductType } from '../enums/product-type.enum';
import { sortPrices } from './product.mapper';

export interface ProductPriceOption {
  id: string;
  currency: Currency;
  amount: string;
  billingPeriod: BillingPeriod;
  isDefault: boolean;
}

// What the cart (and later checkout) needs to know about a product; safe to hand to other modules
export interface ProductPurchaseInfo {
  id: string;
  type: ProductType;
  status: PublicationStatus;
  isPublished: boolean;
  priceOnRequest: boolean;
  isPurchasable: boolean;
  card: ProductCardDto;
  prices: ProductPriceOption[];
}

export function mapPurchaseInfo(
  product: Product,
  card: ProductCardDto,
  prices: readonly ProductPrice[],
  isPublished: boolean,
): ProductPurchaseInfo {
  return {
    id: product.id,
    type: product.type,
    status: product.status,
    isPublished,
    priceOnRequest: product.priceOnRequest,
    isPurchasable: isPublished && !product.priceOnRequest && prices.length > 0,
    card,
    prices: sortPrices(prices).map((price) => ({
      id: price.id,
      currency: price.currency,
      amount: price.amount,
      billingPeriod: price.billingPeriod,
      isDefault: price.isDefault,
    })),
  };
}
