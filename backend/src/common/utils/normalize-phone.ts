import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

// Returns E.164 or null when the input is not a valid number
export function normalizePhone(input: string, defaultRegion: CountryCode = 'VN'): string | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  const parsed = parsePhoneNumberFromString(input.trim(), defaultRegion);
  return parsed?.isValid() ? parsed.number : null;
}
