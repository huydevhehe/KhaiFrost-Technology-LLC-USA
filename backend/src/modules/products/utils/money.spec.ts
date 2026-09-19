import {
  formatMinorUnits,
  isValidAmount,
  multiplyAmount,
  normalizeAmount,
  sumAmounts,
  toMinorUnits,
} from './money';

describe('money', () => {
  it('converts decimal strings to minor units without float error', () => {
    expect(toMinorUnits('0.10')).toBe(10n);
    expect(toMinorUnits('19.9')).toBe(1990n);
    expect(toMinorUnits('5')).toBe(500n);
    expect(toMinorUnits('999999999999.99')).toBe(99999999999999n);
  });

  it('formats minor units back to two decimals', () => {
    expect(formatMinorUnits(5n)).toBe('0.05');
    expect(formatMinorUnits(123456n)).toBe('1234.56');
    expect(normalizeAmount('7.5')).toBe('7.50');
  });

  it('sums and multiplies exactly', () => {
    expect(sumAmounts(['0.10', '0.20'])).toBe('0.30');
    expect(multiplyAmount('19.99', 3)).toBe('59.97');
    expect(sumAmounts([])).toBe('0.00');
  });

  it('validates the amount shape', () => {
    expect(isValidAmount('10')).toBe(true);
    expect(isValidAmount('10.999')).toBe(false);
    expect(isValidAmount('-1')).toBe(false);
    expect(isValidAmount('1e5')).toBe(false);
    expect(isValidAmount('')).toBe(false);
  });
});
