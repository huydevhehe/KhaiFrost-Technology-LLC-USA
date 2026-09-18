import { normalizePhone } from './normalize-phone';

describe('normalizePhone', () => {
  it('normalizes a national Vietnamese mobile number', () => {
    expect(normalizePhone('0912 345 678')).toBe('+84912345678');
  });

  it('accepts a Vietnamese number already in international format', () => {
    expect(normalizePhone('+84 912-345-678')).toBe('+84912345678');
  });

  it('accepts foreign numbers that carry a country code', () => {
    expect(normalizePhone('+1 415 555 2671')).toBe('+14155552671');
  });

  it('returns null for invalid or empty input', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
  });
});
