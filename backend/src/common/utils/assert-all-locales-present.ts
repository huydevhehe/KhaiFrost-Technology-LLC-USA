import { SUPPORTED_LOCALES, Locale } from '../enums/locale.enum';
import { translationMissing } from '../exceptions/exception.factories';

type TranslationFields = Record<string, unknown>;
export type TranslationsInput =
  | Partial<Record<Locale, TranslationFields | null | undefined>>
  | ReadonlyArray<{ locale: Locale | string } & TranslationFields>;

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function indexByLocale(translations: TranslationsInput): Map<string, TranslationFields> {
  const byLocale = new Map<string, TranslationFields>();
  if (Array.isArray(translations)) {
    for (const item of translations as ReadonlyArray<{ locale: string } & TranslationFields>) {
      byLocale.set(item.locale, item);
    }
  } else {
    for (const [locale, fields] of Object.entries(translations)) {
      if (fields) byLocale.set(locale, fields as TranslationFields);
    }
  }
  return byLocale;
}

// Drafts may be partial; call this when publishing: vi AND en are required for every field
export function assertAllLocalesPresent(
  translations: TranslationsInput,
  requiredFields: readonly string[],
): void {
  const byLocale = indexByLocale(translations);
  const missing: { locale: string; field: string }[] = [];
  for (const locale of SUPPORTED_LOCALES) {
    const fields = byLocale.get(locale);
    for (const field of requiredFields) {
      if (!fields || isBlank(fields[field])) missing.push({ locale, field });
    }
  }
  if (missing.length > 0) throw translationMissing(missing);
}
