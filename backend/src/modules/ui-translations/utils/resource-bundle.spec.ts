import {
  extractPlaceholders,
  flattenResourceBundle,
  placeholdersMatch,
  unflattenResourceBundle,
  unflattenResourceBundleWithConflicts,
} from './resource-bundle';

describe('resource bundle utilities', () => {
  const nested = {
    nav: { home: 'Home', about: 'About' },
    hero: { headline: 'Build', cta: { primary: 'Go' } },
    title: 'KhaiFrost',
  };

  it('flattens nested keys into dot paths', () => {
    expect(flattenResourceBundle(nested)).toEqual({
      'nav.home': 'Home',
      'nav.about': 'About',
      'hero.headline': 'Build',
      'hero.cta.primary': 'Go',
      title: 'KhaiFrost',
    });
  });

  it('round-trips flatten and unflatten', () => {
    expect(unflattenResourceBundle(flattenResourceBundle(nested))).toEqual(nested);
  });

  it('converts numbers and booleans, skips null and turns arrays into numeric segments', () => {
    expect(flattenResourceBundle({ a: 1, b: true, c: null, d: ['x', 'y'] })).toEqual({
      a: '1',
      b: 'true',
      'd.0': 'x',
      'd.1': 'y',
    });
  });

  it('rejects non-objects, dotted keys and excessive depth', () => {
    expect(() => flattenResourceBundle('text')).toThrow();
    expect(() => flattenResourceBundle([])).toThrow();
    expect(() => flattenResourceBundle({ 'a.b': 'x' })).toThrow(/dots/);
    let deep: Record<string, unknown> = { leaf: 'x' };
    for (let level = 0; level < 20; level += 1) deep = { n: deep };
    expect(() => flattenResourceBundle(deep)).toThrow(/deeper/);
  });

  it('reports keys that would clash between text and object', () => {
    const { bundle, conflicts } = unflattenResourceBundleWithConflicts({
      a: 'text',
      'a.b': 'child',
      'c.d': 'ok',
    });
    expect(bundle).toEqual({ a: 'text', c: { d: 'ok' } });
    expect(conflicts).toEqual(['a.b']);
  });

  it('extracts interpolation variable names', () => {
    expect(extractPlaceholders('Why {{category}} and {{ count }} and {{category}}')).toEqual([
      'category',
      'count',
    ]);
    expect(extractPlaceholders('{{value, number}} {{- raw}}')).toEqual(['raw', 'value']);
    expect(extractPlaceholders('no variables')).toEqual([]);
    expect(extractPlaceholders(null)).toEqual([]);
  });

  it('compares placeholder sets regardless of order', () => {
    expect(placeholdersMatch('{{a}} {{b}}', '{{b}} then {{a}}')).toBe(true);
    expect(placeholdersMatch('{{a}}', '{{b}}')).toBe(false);
    expect(placeholdersMatch('{{a}}', 'plain')).toBe(false);
    expect(placeholdersMatch('plain', 'other')).toBe(true);
  });
});
