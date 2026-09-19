import { isHttpUrlOrSitePath } from './is-http-url-or-site-path.validator';

describe('isHttpUrlOrSitePath', () => {
  it.each(['/lien-he', '/dich-vu/ai#faq', 'https://example.com/demo', 'http://example.com'])(
    'accepts %s',
    (value) => expect(isHttpUrlOrSitePath(value)).toBe(true),
  );

  it.each([
    '//evil.example',
    'javascript:alert(1)',
    'ftp://example.com',
    'lien-he',
    '',
    'https://',
    '/a b',
  ])('rejects %s', (value) => expect(isHttpUrlOrSitePath(value)).toBe(false));

  it('rejects non strings', () => {
    expect(isHttpUrlOrSitePath(null)).toBe(false);
    expect(isHttpUrlOrSitePath(5)).toBe(false);
  });
});
