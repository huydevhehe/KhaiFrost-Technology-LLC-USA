import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import { REQUIRED_PUBLISH_FIELDS } from '../constants/post-constraints';
import { PostTranslation } from '../entities/post-translation.entity';

type TranslationFields = Pick<PostTranslation, 'locale' | 'title' | 'excerpt' | 'contentHtml'>;

export function isTranslationComplete(translation: TranslationFields | undefined): boolean {
  if (!translation) return false;
  return REQUIRED_PUBLISH_FIELDS.every((field) => translation[field].trim() !== '');
}

// Locales whose required fields are not all filled in, i.e. what still blocks publishing
export function findMissingLocales(translations: readonly TranslationFields[]): Locale[] {
  return SUPPORTED_LOCALES.filter(
    (locale) => !isTranslationComplete(translations.find((item) => item.locale === locale)),
  );
}
