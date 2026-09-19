import {
  conflict,
  notFound,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { BillingPeriod, RECURRING_BILLING_PERIODS } from '../../products/enums/billing-period.enum';
import { Currency } from '../../products/enums/currency.enum';
import { ProductType } from '../../products/enums/product-type.enum';
import {
  ProductPriceOption,
  ProductPurchaseInfo,
} from '../../products/mappers/product-purchase-info';
import { businessRuleViolation } from '../../products/utils/business-rule-violation';

export interface CartLineRequest {
  quantity: number;
  currency?: Currency;
  billingPeriod?: BillingPeriod;
}

const SINGLE_QUANTITY_TYPES: ReadonlySet<ProductType> = new Set([
  ProductType.SOURCE_CODE,
  ProductType.LIVE_DEMO,
]);

export function allowsQuantity(type: ProductType): boolean {
  return !SINGLE_QUANTITY_TYPES.has(type);
}

// Source code and live demos are one-off licences, so the quantity is always 1
export function resolveQuantity(type: ProductType, requested: number): number {
  return allowsQuantity(type) ? requested : 1;
}

export function assertPurchasable(info: ProductPurchaseInfo | undefined): ProductPurchaseInfo {
  if (!info || !info.isPublished) throw notFound('Product');
  if (info.priceOnRequest) {
    throw businessRuleViolation(
      'PRICE_ON_REQUEST',
      'This product is priced on request. Please contact us through the contact form for a quote.',
      { hint: 'contact_form' },
    );
  }
  if (info.prices.length === 0) {
    throw businessRuleViolation('PRODUCT_NOT_PURCHASABLE', 'This product cannot be purchased yet');
  }
  return info;
}

function currencyMismatch(cartCurrency: Currency, productId: string) {
  return conflict(
    'CART_CURRENCY_MISMATCH',
    `Your cart is in ${cartCurrency}; this product has no ${cartCurrency} price`,
    { cartCurrency, productId },
  );
}

// Chooses the ProductPrice a new cart line will point at, honouring the one-currency-per-cart rule
export function selectPrice(
  info: ProductPurchaseInfo,
  cartCurrency: Currency | null,
  request: CartLineRequest,
): ProductPriceOption {
  let currency: Currency;
  if (cartCurrency) {
    if (request.currency && request.currency !== cartCurrency) {
      throw currencyMismatch(cartCurrency, info.id);
    }
    currency = cartCurrency;
    if (!info.prices.some((price) => price.currency === currency)) {
      throw currencyMismatch(cartCurrency, info.id);
    }
  } else {
    currency =
      request.currency ?? (info.prices.find((price) => price.isDefault) ?? info.prices[0]).currency;
  }

  if (info.type === ProductType.HOSTING_PLAN) {
    if (!request.billingPeriod || !RECURRING_BILLING_PERIODS.includes(request.billingPeriod)) {
      throw validationFailed([
        {
          field: 'billingPeriod',
          messages: ['Choose monthly or yearly billing for a hosting plan'],
        },
      ]);
    }
  }

  const candidates = info.prices.filter(
    (price) =>
      price.currency === currency &&
      (!request.billingPeriod || price.billingPeriod === request.billingPeriod),
  );
  if (candidates.length === 0) {
    throw businessRuleViolation(
      'PRICE_NOT_AVAILABLE',
      'This product has no price for the requested currency and billing period',
      { currency, billingPeriod: request.billingPeriod ?? null },
    );
  }
  if (candidates.length === 1) return candidates[0];

  const preferred =
    candidates.find((price) => price.isDefault) ??
    candidates.find((price) => price.billingPeriod === BillingPeriod.ONE_TIME);
  if (!preferred) {
    throw validationFailed([
      {
        field: 'billingPeriod',
        messages: ['This product has several billing periods; choose one'],
      },
    ]);
  }
  return preferred;
}
