import { ApplicationException } from '../../../common/exceptions/application.exception';
import { BillingPeriod } from '../enums/billing-period.enum';
import { Currency } from '../enums/currency.enum';
import { normalizePrices } from './normalize-prices';

describe('normalizePrices', () => {
  it('marks the first price of each currency as default when none is flagged', () => {
    const result = normalizePrices([
      { currency: Currency.USD, amount: '10', billingPeriod: BillingPeriod.MONTHLY },
      { currency: Currency.USD, amount: '100', billingPeriod: BillingPeriod.YEARLY },
      { currency: Currency.VND, amount: '250000', billingPeriod: BillingPeriod.MONTHLY },
    ]);
    expect(result.map((price) => price.isDefault)).toEqual([true, false, true]);
    expect(result[0].amount).toBe('10.00');
  });

  it('keeps an explicit default', () => {
    const result = normalizePrices([
      { currency: Currency.USD, amount: '10', billingPeriod: BillingPeriod.MONTHLY },
      {
        currency: Currency.USD,
        amount: '100',
        billingPeriod: BillingPeriod.YEARLY,
        isDefault: true,
      },
    ]);
    expect(result.map((price) => price.isDefault)).toEqual([false, true]);
  });

  it('rejects duplicates, two defaults and fractional VND', () => {
    expect(() =>
      normalizePrices([
        { currency: Currency.USD, amount: '1', billingPeriod: BillingPeriod.MONTHLY },
        { currency: Currency.USD, amount: '2', billingPeriod: BillingPeriod.MONTHLY },
      ]),
    ).toThrow(ApplicationException);
    expect(() =>
      normalizePrices([
        {
          currency: Currency.USD,
          amount: '1',
          billingPeriod: BillingPeriod.MONTHLY,
          isDefault: true,
        },
        {
          currency: Currency.USD,
          amount: '2',
          billingPeriod: BillingPeriod.YEARLY,
          isDefault: true,
        },
      ]),
    ).toThrow(ApplicationException);
    expect(() =>
      normalizePrices([
        { currency: Currency.VND, amount: '1000.50', billingPeriod: BillingPeriod.ONE_TIME },
      ]),
    ).toThrow(ApplicationException);
  });
});
