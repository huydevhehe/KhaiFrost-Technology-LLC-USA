export enum BillingPeriod {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export const RECURRING_BILLING_PERIODS: readonly BillingPeriod[] = [
  BillingPeriod.MONTHLY,
  BillingPeriod.YEARLY,
];
