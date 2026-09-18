import { ApplicationException } from '../exceptions/application.exception';
import { Locale } from '../enums/locale.enum';
import { assertAllLocalesPresent } from './assert-all-locales-present';

function captureFailure(action: () => void): ApplicationException {
  try {
    action();
  } catch (error) {
    return error as ApplicationException;
  }
  throw new Error('expected the call to throw');
}

describe('assertAllLocalesPresent', () => {
  it('passes when every locale has every required field', () => {
    expect(() =>
      assertAllLocalesPresent(
        [
          { locale: Locale.VI, title: 'Xin chao', body: 'Noi dung' },
          { locale: Locale.EN, title: 'Hello', body: 'Content' },
        ],
        ['title', 'body'],
      ),
    ).not.toThrow();
  });

  it('accepts a record keyed by locale', () => {
    expect(() =>
      assertAllLocalesPresent({ vi: { title: 'a' }, en: { title: 'b' } }, ['title']),
    ).not.toThrow();
  });

  it('lists every missing locale and field pair', () => {
    const failure = captureFailure(() =>
      assertAllLocalesPresent(
        [{ locale: Locale.VI, title: 'Xin chao', body: '   ' }],
        ['title', 'body'],
      ),
    );
    expect(failure.code).toBe('TRANSLATION_MISSING');
    expect(failure.details).toEqual([
      { locale: 'vi', field: 'body' },
      { locale: 'en', field: 'title' },
      { locale: 'en', field: 'body' },
    ]);
  });
});
