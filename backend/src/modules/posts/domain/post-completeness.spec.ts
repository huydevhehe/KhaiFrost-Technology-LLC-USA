import { Locale } from '../../../common/enums/locale.enum';
import { findMissingLocales, isTranslationComplete } from './post-completeness';

const complete = (locale: Locale) => ({
  locale,
  title: 'Title',
  excerpt: 'Excerpt',
  contentHtml: '<p>Body</p>',
});

describe('post completeness', () => {
  it('reports both locales when there are no translations', () => {
    expect(findMissingLocales([])).toEqual([Locale.VI, Locale.EN]);
  });

  it('reports only the incomplete locale', () => {
    expect(
      findMissingLocales([complete(Locale.VI), { ...complete(Locale.EN), title: ' ' }]),
    ).toEqual([Locale.EN]);
  });

  it('reports nothing when both are complete', () => {
    expect(findMissingLocales([complete(Locale.VI), complete(Locale.EN)])).toEqual([]);
  });

  it('treats a missing row as incomplete', () => {
    expect(isTranslationComplete(undefined)).toBe(false);
    expect(isTranslationComplete({ ...complete(Locale.VI), contentHtml: '' })).toBe(false);
  });
});
