import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { ApplicationException } from '../../../common/exceptions/application.exception';
import { BillingPeriod } from '../enums/billing-period.enum';
import { ProductType } from '../enums/product-type.enum';
import {
  assertPublishable,
  PublishableProduct,
  resolveTransition,
} from './product-publication.policy';

function completeProduct(overrides: Partial<PublishableProduct> = {}): PublishableProduct {
  const translation = { name: 'Name', tagline: 'Tagline', descriptionHtml: '<p>Body</p>' };
  return {
    type: ProductType.SOURCE_CODE,
    priceOnRequest: false,
    demoUrl: null,
    prices: [{ billingPeriod: BillingPeriod.ONE_TIME }],
    translations: [
      { locale: 'vi', ...translation },
      { locale: 'en', ...translation },
    ],
    ...overrides,
  };
}

function codeOf(action: () => void): string | undefined {
  try {
    action();
  } catch (error) {
    return (error as ApplicationException).code;
  }
  return undefined;
}

describe('resolveTransition', () => {
  it('follows the workflow table', () => {
    expect(resolveTransition('submit', PublicationStatus.DRAFT)).toBe(PublicationStatus.IN_REVIEW);
    expect(resolveTransition('publish', PublicationStatus.IN_REVIEW)).toBe(
      PublicationStatus.PUBLISHED,
    );
    expect(resolveTransition('unpublish', PublicationStatus.PUBLISHED)).toBe(
      PublicationStatus.DRAFT,
    );
    expect(resolveTransition('archive', PublicationStatus.PUBLISHED)).toBe(
      PublicationStatus.ARCHIVED,
    );
  });

  it('rejects impossible moves', () => {
    expect(codeOf(() => resolveTransition('submit', PublicationStatus.PUBLISHED))).toBe(
      'INVALID_STATUS_TRANSITION',
    );
    expect(codeOf(() => resolveTransition('publish', PublicationStatus.PUBLISHED))).toBe(
      'INVALID_STATUS_TRANSITION',
    );
  });
});

describe('assertPublishable', () => {
  it('accepts a complete product', () => {
    expect(() => assertPublishable(completeProduct())).not.toThrow();
  });

  it('requires vi and en for name, tagline and description', () => {
    const product = completeProduct({
      translations: [{ locale: 'vi', name: 'Name', tagline: 'T', descriptionHtml: '<p>x</p>' }],
    });
    expect(codeOf(() => assertPublishable(product))).toBe('TRANSLATION_MISSING');
  });

  it('requires a price unless the product is price on request', () => {
    expect(codeOf(() => assertPublishable(completeProduct({ prices: [] })))).toBe(
      'PRODUCT_PRICE_REQUIRED',
    );
    expect(() =>
      assertPublishable(completeProduct({ prices: [], priceOnRequest: true })),
    ).not.toThrow();
  });

  it('requires recurring prices for hosting plans', () => {
    const hosting = completeProduct({
      type: ProductType.HOSTING_PLAN,
      prices: [{ billingPeriod: BillingPeriod.ONE_TIME }],
    });
    expect(codeOf(() => assertPublishable(hosting))).toBe('HOSTING_BILLING_PERIOD_REQUIRED');
    expect(() =>
      assertPublishable({ ...hosting, prices: [{ billingPeriod: BillingPeriod.MONTHLY }] }),
    ).not.toThrow();
  });

  it('requires a demo url for live demos', () => {
    expect(codeOf(() => assertPublishable(completeProduct({ type: ProductType.LIVE_DEMO })))).toBe(
      'DEMO_URL_REQUIRED',
    );
  });
});
