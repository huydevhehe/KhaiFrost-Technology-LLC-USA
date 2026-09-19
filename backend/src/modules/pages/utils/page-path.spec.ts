import { describePathProblem, normalizeLookupPath } from './page-path';

describe('page path rules', () => {
  it.each(['/', '/ve-chung-toi', '/dich-vu/ai-cloud', '/a1/b-2'])('accepts %s', (path) => {
    expect(describePathProblem(path)).toBeNull();
  });

  it.each([
    '',
    'no-slash',
    '/Upper',
    '/trailing/',
    '/double//slash',
    '/under_score',
    '/-dash',
    '/dash-',
    '/a/b/c/d/e/f',
    '/space here',
    '/../etc',
    '/admin',
    '/admin/pages',
    '/api',
    '/login',
    '/register',
    '/account/orders',
    '/uploads/x',
    '/_next/static',
  ])('rejects %s', (path) => {
    expect(describePathProblem(path)).not.toBeNull();
  });

  it('normalizes public lookups', () => {
    expect(normalizeLookupPath('/Ve-Chung-Toi/')).toBe('/ve-chung-toi');
    expect(normalizeLookupPath('dich-vu')).toBe('/dich-vu');
    expect(normalizeLookupPath('/')).toBe('/');
    expect(normalizeLookupPath('//')).toBe('/');
  });
});
