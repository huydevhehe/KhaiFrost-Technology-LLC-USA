// Amounts travel as decimal strings ("19.99"); arithmetic uses integer minor units (hundredths) so no float is involved
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

export function isValidAmount(value: string): boolean {
  return AMOUNT_PATTERN.test(value);
}

export function toMinorUnits(amount: string): bigint {
  if (!isValidAmount(amount)) throw new Error(`Invalid amount: ${amount}`);
  const [whole, fraction = ''] = amount.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function formatMinorUnits(minor: bigint): string {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function normalizeAmount(amount: string): string {
  return formatMinorUnits(toMinorUnits(amount));
}

export function multiplyAmount(amount: string, quantity: number): string {
  return formatMinorUnits(toMinorUnits(amount) * BigInt(quantity));
}

export function sumAmounts(amounts: readonly string[]): string {
  return formatMinorUnits(amounts.reduce((total, amount) => total + toMinorUnits(amount), 0n));
}
