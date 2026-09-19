import { validationFailed } from '../../../common/exceptions/exception.factories';
import { BillingPeriod } from '../enums/billing-period.enum';
import { Currency } from '../enums/currency.enum';
import { normalizeAmount } from './money';

export interface PriceInput {
  currency: Currency;
  amount: string;
  billingPeriod: BillingPeriod;
  isDefault?: boolean;
}

export interface NormalizedPrice {
  currency: Currency;
  amount: string;
  billingPeriod: BillingPeriod;
  isDefault: boolean;
}

// Enforces: unique (currency, billingPeriod), whole VND amounts, exactly one default per currency
export function normalizePrices(inputs: readonly PriceInput[]): NormalizedPrice[] {
  const problems: { field: string; messages: string[] }[] = [];
  const seen = new Set<string>();
  const defaultsPerCurrency = new Map<Currency, number>();

  inputs.forEach((input, index) => {
    const key = `${input.currency}:${input.billingPeriod}`;
    if (seen.has(key)) {
      problems.push({
        field: `prices.${index}`,
        messages: [`Duplicate price for ${input.currency} ${input.billingPeriod}`],
      });
    }
    seen.add(key);
    if (input.currency === Currency.VND && !/^\d+(\.0{1,2})?$/.test(input.amount)) {
      problems.push({
        field: `prices.${index}.amount`,
        messages: ['VND amounts must be whole numbers'],
      });
    }
    if (input.isDefault) {
      defaultsPerCurrency.set(input.currency, (defaultsPerCurrency.get(input.currency) ?? 0) + 1);
    }
  });

  for (const [currency, count] of defaultsPerCurrency) {
    if (count > 1) {
      problems.push({
        field: 'prices',
        messages: [`Only one ${currency} price can be the default`],
      });
    }
  }
  if (problems.length > 0) throw validationFailed(problems);

  const currenciesWithDefault = new Set(defaultsPerCurrency.keys());
  return inputs.map((input) => {
    const needsDefault = !currenciesWithDefault.has(input.currency);
    if (needsDefault) currenciesWithDefault.add(input.currency);
    return {
      currency: input.currency,
      amount: normalizeAmount(input.amount),
      billingPeriod: input.billingPeriod,
      isDefault: Boolean(input.isDefault) || needsDefault,
    };
  });
}
