import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { conflict } from '../../../common/exceptions/exception.factories';
import { assertAllLocalesPresent } from '../../../common/utils/assert-all-locales-present';
import { BillingPeriod, RECURRING_BILLING_PERIODS } from '../enums/billing-period.enum';
import { ProductType } from '../enums/product-type.enum';
import { businessRuleViolation } from '../utils/business-rule-violation';

export type ProductTransition = 'submit' | 'publish' | 'unpublish' | 'archive';

const TRANSITIONS: Record<
  ProductTransition,
  { from: readonly PublicationStatus[]; to: PublicationStatus }
> = {
  submit: { from: [PublicationStatus.DRAFT], to: PublicationStatus.IN_REVIEW },
  publish: {
    from: [PublicationStatus.DRAFT, PublicationStatus.IN_REVIEW, PublicationStatus.ARCHIVED],
    to: PublicationStatus.PUBLISHED,
  },
  // Also serves as "send back to draft" for a review and "restore" for an archived product
  unpublish: {
    from: [PublicationStatus.PUBLISHED, PublicationStatus.IN_REVIEW, PublicationStatus.ARCHIVED],
    to: PublicationStatus.DRAFT,
  },
  archive: {
    from: [PublicationStatus.DRAFT, PublicationStatus.IN_REVIEW, PublicationStatus.PUBLISHED],
    to: PublicationStatus.ARCHIVED,
  },
};

export function resolveTransition(
  transition: ProductTransition,
  current: PublicationStatus,
): PublicationStatus {
  const rule = TRANSITIONS[transition];
  if (!rule.from.includes(current)) {
    throw conflict(
      'INVALID_STATUS_TRANSITION',
      `A product that is ${current} cannot be moved with "${transition}"`,
      { current, transition },
    );
  }
  return rule.to;
}

export interface PublishableProduct {
  type: ProductType;
  priceOnRequest: boolean;
  demoUrl: string | null;
  prices: ReadonlyArray<{ billingPeriod: BillingPeriod }>;
  translations: ReadonlyArray<{
    locale: string;
    name: string | null;
    tagline: string | null;
    descriptionHtml: string | null;
  }>;
}

export const REQUIRED_TRANSLATION_FIELDS = ['name', 'tagline', 'descriptionHtml'] as const;

// Runs when a product goes live and again whenever a live product is edited
export function assertPublishable(product: PublishableProduct): void {
  assertAllLocalesPresent(product.translations, REQUIRED_TRANSLATION_FIELDS);

  if (!product.priceOnRequest && product.prices.length === 0) {
    throw businessRuleViolation(
      'PRODUCT_PRICE_REQUIRED',
      'Add at least one price or mark the product as price on request',
    );
  }
  if (
    product.type === ProductType.HOSTING_PLAN &&
    !product.priceOnRequest &&
    product.prices.some((price) => !RECURRING_BILLING_PERIODS.includes(price.billingPeriod))
  ) {
    throw businessRuleViolation(
      'HOSTING_BILLING_PERIOD_REQUIRED',
      'Hosting plans can only have monthly or yearly prices',
    );
  }
  if (product.type === ProductType.LIVE_DEMO && !product.demoUrl) {
    throw businessRuleViolation('DEMO_URL_REQUIRED', 'A live demo product needs a demo URL');
  }
}
