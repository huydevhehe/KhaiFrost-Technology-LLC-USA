import { Locale } from '../../../common/enums/locale.enum';
import { collectMediaReferences, localizeValue, resolveMediaFields } from './setting-media-paths';

const SPECS = [
  { path: 'logoId', outputKey: 'logo' },
  { path: 'offices[].imageId', outputKey: 'image' },
];

describe('setting media paths', () => {
  const value = {
    logoId: '11111111-1111-4111-8111-111111111111',
    other: 'text',
    offices: [
      { id: 'a', imageId: '22222222-2222-4222-8222-222222222222' },
      { id: 'b', imageId: null },
    ],
  };

  it('collects media ids with their field path', () => {
    expect(collectMediaReferences(value, SPECS)).toEqual([
      { fieldKey: 'logoId', mediaAssetId: '11111111-1111-4111-8111-111111111111' },
      { fieldKey: 'offices[].imageId', mediaAssetId: '22222222-2222-4222-8222-222222222222' },
    ]);
  });

  it('replaces ids by resolved media without touching the input', () => {
    const resolved = resolveMediaFields(value, SPECS, (id) => `url:${id.slice(0, 2)}`);
    expect(resolved).toEqual({
      logo: 'url:11',
      other: 'text',
      offices: [
        { id: 'a', image: 'url:22' },
        { id: 'b', image: null },
      ],
    });
    expect(value.logoId).toBeDefined();
  });

  it('collapses localized text objects to one locale with fallback', () => {
    const input = {
      name: { vi: 'Xin chao', en: 'Hello' },
      nested: [{ label: { vi: 'Chi vi' } }],
      keep: { vi: 'a', other: 'b' },
      count: 3,
    };
    expect(localizeValue(input, Locale.EN, Locale.VI)).toEqual({
      name: 'Hello',
      nested: [{ label: 'Chi vi' }],
      keep: { vi: 'a', other: 'b' },
      count: 3,
    });
  });
});
