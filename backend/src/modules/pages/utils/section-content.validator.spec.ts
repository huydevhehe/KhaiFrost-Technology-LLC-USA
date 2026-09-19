import { ApplicationException } from '../../../common/exceptions/application.exception';
import { Locale } from '../../../common/enums/locale.enum';
import {
  getSectionTypeDefinition,
  isTranslatedList,
  listSectionTypeDefinitions,
} from '../constants/section-types.registry';
import { resolveSectionContent } from './section-content.resolver';
import {
  extractMediaReferences,
  findPublishGaps,
  validateSectionContent,
} from './section-content.validator';

const MEDIA_ID = '11111111-1111-4111-8111-111111111111';

function definition(type: string) {
  const found = getSectionTypeDefinition(type);
  if (!found) throw new Error(`missing type ${type}`);
  return found;
}

function failures(type: string, content: unknown): Record<string, string[]> {
  try {
    validateSectionContent(definition(type), content);
  } catch (error) {
    const details = (error as ApplicationException).getResponse() as {
      details: { field: string; messages: string[] }[];
    };
    return Object.fromEntries(details.details.map((item) => [item.field, item.messages]));
  }
  throw new Error('expected validation to fail');
}

describe('section type registry', () => {
  it('provides the required section types', () => {
    const types = listSectionTypeDefinitions().map((item) => item.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'hero',
        'rich-text',
        'image-text',
        'stats',
        'card-grid',
        'cta',
        'gallery',
        'faq',
        'video-embed',
        'featured-content',
        'custom',
      ]),
    );
  });

  it('is internally consistent', () => {
    for (const item of listSectionTypeDefinitions()) {
      const keys = item.fields.map((field) => field.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const field of item.fields) {
        if (field.translatable) expect(['text', 'textarea', 'richtext']).toContain(field.kind);
        if (field.kind === 'select') expect(field.options?.length).toBeGreaterThan(0);
        if (field.altFieldKey) {
          const scope = item.fields;
          expect(scope.find((sibling) => sibling.key === field.altFieldKey)?.translatable).toBe(
            true,
          );
        }
        if (field.kind === 'list') {
          expect(field.itemFields?.length).toBeGreaterThan(0);
          for (const sub of field.itemFields ?? []) {
            expect(sub.kind).not.toBe('list');
            if (sub.altFieldKey) {
              expect(field.itemFields?.find((s) => s.key === sub.altFieldKey)?.translatable).toBe(
                true,
              );
            }
          }
        }
      }
    }
  });
});

describe('validateSectionContent', () => {
  it('accepts a complete hero and cleans values', () => {
    const result = validateSectionContent(definition('hero'), {
      shared: { backgroundImage: MEDIA_ID, primaryCtaUrl: '/lien-he', alignment: 'left' },
      translations: {
        vi: { headline: '  Xin chao ', description: '' },
        en: { headline: 'Hello' },
      },
    });
    expect(result.content.shared).toEqual({
      backgroundImage: MEDIA_ID,
      primaryCtaUrl: '/lien-he',
      alignment: 'left',
    });
    expect(result.content.translations).toEqual({
      vi: { headline: 'Xin chao' },
      en: { headline: 'Hello' },
    });
    expect(result.mediaReferences).toEqual([
      { fieldKey: 'backgroundImage', mediaAssetId: MEDIA_ID },
    ]);
  });

  it('rejects unknown fields and fields placed on the wrong side', () => {
    const errors = failures('hero', {
      shared: { nope: 1, headline: 'x' },
      translations: { vi: { backgroundImage: MEDIA_ID, other: 'y' }, fr: {} },
      extra: true,
    });
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining([
        'shared.nope',
        'shared.headline',
        'translations.vi.backgroundImage',
        'translations.vi.other',
        'translations.fr',
        'content.extra',
      ]),
    );
  });

  it('rejects bad urls', () => {
    const errors = failures('hero', {
      shared: {
        primaryCtaUrl: 'javascript:alert(1)',
        secondaryCtaUrl: '//evil.example.com',
        backgroundImage: 'not-a-uuid',
      },
    });
    expect(errors['shared.primaryCtaUrl']).toBeDefined();
    expect(errors['shared.secondaryCtaUrl']).toBeDefined();
    expect(errors['shared.backgroundImage']).toBeDefined();
    expect(
      validateSectionContent(definition('hero'), {
        shared: { primaryCtaUrl: 'https://example.com/a?b=1', secondaryCtaUrl: '#contact' },
      }).content.shared,
    ).toEqual({ primaryCtaUrl: 'https://example.com/a?b=1', secondaryCtaUrl: '#contact' });
  });

  it('strips scripts from rich text and refuses HTML in plain text', () => {
    const result = validateSectionContent(definition('custom'), {
      translations: {
        vi: { body: '<p>Hi</p><script>alert(1)</script><img src="javascript:x">' },
      },
    });
    const body = (result.content.translations.vi as { body: string }).body;
    expect(body).toContain('<p>Hi</p>');
    expect(body).not.toMatch(/script|javascript|alert/);
    const errors = failures('custom', {
      translations: { vi: { heading: '<script>alert(1)</script>' } },
    });
    expect(errors['translations.vi.heading']).toContain('must not contain HTML');
    const raw = failures('custom', { shared: { html: '<b>x</b>', script: 'x' } });
    expect(Object.keys(raw)).toEqual(['shared.html', 'shared.script']);
  });

  it('restricts video embeds to https youtube and vimeo', () => {
    const ok = validateSectionContent(definition('video-embed'), {
      shared: { videoUrl: 'https://www.youtube.com/embed/abc' },
    });
    expect(ok.content.shared.videoUrl).toBe('https://www.youtube.com/embed/abc');
    for (const bad of [
      'http://www.youtube.com/embed/abc',
      'https://evil.example.com/video',
      'https://youtube.com.evil.com/x',
      '/relative',
    ]) {
      expect(
        failures('video-embed', { shared: { videoUrl: bad } })['shared.videoUrl'],
      ).toBeDefined();
    }
  });

  it('validates numbers and selects for featured content', () => {
    const errors = failures('featured-content', {
      shared: { collection: 'users', count: 99, categorySlug: 'Bad Slug', featuredOnly: 'yes' },
    });
    expect(Object.keys(errors).sort()).toEqual([
      'shared.categorySlug',
      'shared.collection',
      'shared.count',
      'shared.featuredOnly',
    ]);
    expect(
      validateSectionContent(definition('featured-content'), {
        shared: { collection: 'posts', count: 3, featuredOnly: true, sort: 'newest' },
      }).content.shared.count,
    ).toBe(3);
  });

  describe('lists', () => {
    const stats = {
      shared: { items: [{ id: 'founded', icon: 'calendar', value: '2020' }] },
      translations: {
        vi: { items: { founded: { label: 'Nam thanh lap' } } },
        en: { items: { founded: { label: 'Founded' } } },
      },
    };

    it('keeps structure in shared and text in translations', () => {
      const result = validateSectionContent(definition('stats'), stats);
      expect(result.content).toEqual(stats);
      expect(isTranslatedList(definition('stats').fields[3])).toBe(true);
    });

    it('rejects duplicate or missing item ids, misplaced item fields and orphan translations', () => {
      const errors = failures('stats', {
        shared: {
          items: [{ id: 'a', label: 'x' }, { id: 'a' }, { value: '1' }, { id: 'b', bogus: 1 }],
        },
        translations: { vi: { items: { ghost: { label: 'x' }, a: { value: '9' } } } },
      });
      expect(Object.keys(errors)).toEqual(
        expect.arrayContaining([
          'shared.items[0].label',
          'shared.items[1].id',
          'shared.items[2].id',
          'shared.items[3].bogus',
          'translations.vi.items.ghost',
          'translations.vi.items.a.value',
        ]),
      );
    });

    it('limits the number of items and tracks media inside items', () => {
      const many = Array.from({ length: 13 }, (_, index) => ({ id: `i${index}` }));
      expect(failures('stats', { shared: { items: many } })['shared.items']).toBeDefined();
      const result = validateSectionContent(definition('gallery'), {
        shared: { items: [{ id: 'one', image: MEDIA_ID }] },
      });
      expect(result.mediaReferences).toEqual([
        { fieldKey: 'items[].image', mediaAssetId: MEDIA_ID },
      ]);
    });
  });
});

describe('findPublishGaps', () => {
  it('lists missing required translations per locale and missing shared fields', () => {
    const { content } = validateSectionContent(definition('hero'), {
      shared: {},
      translations: { vi: { headline: 'Chao' } },
    });
    const gaps = findPublishGaps(definition('hero'), content, 'hero');
    expect(gaps.missingTranslations).toEqual([{ locale: 'en', field: 'hero.headline' }]);
    expect(gaps.missingRequired).toEqual([{ field: 'hero.backgroundImage' }]);
  });

  it('checks required item fields in lists', () => {
    const { content } = validateSectionContent(definition('stats'), {
      shared: { items: [{ id: 'a' }, { id: 'b', value: '5' }] },
      translations: { vi: { items: { b: { label: 'Nam' } } } },
    });
    const gaps = findPublishGaps(definition('stats'), content, 'stats');
    expect(gaps.missingRequired).toEqual([{ field: 'stats.items[a].value' }]);
    expect(gaps.missingTranslations).toEqual(
      expect.arrayContaining([
        { locale: 'vi', field: 'stats.items[a].label' },
        { locale: 'en', field: 'stats.items[a].label' },
        { locale: 'en', field: 'stats.items[b].label' },
      ]),
    );
  });

  it('reports an empty required list', () => {
    const gaps = findPublishGaps(definition('faq'), { shared: {}, translations: {} }, 'faq');
    expect(gaps.missingRequired).toEqual([{ field: 'faq.items' }]);
  });
});

describe('media and resolution', () => {
  it('extracts references from stored content and resolves to one locale with alt text', () => {
    const { content } = validateSectionContent(definition('card-grid'), {
      shared: { columns: '3', items: [{ id: 'one', image: MEDIA_ID, icon: 'rocket' }] },
      translations: {
        vi: { heading: 'Gia tri', items: { one: { title: 'Doi moi', imageAlt: 'Anh vi' } } },
        en: { items: { one: { title: 'Innovation' } } },
      },
    });
    expect(extractMediaReferences(definition('card-grid'), content)).toEqual([
      { fieldKey: 'items[].image', mediaAssetId: MEDIA_ID },
    ]);
    const media = new Map([
      [MEDIA_ID, { url: 'https://cdn/x.jpg', thumbnailUrl: null, width: 10, height: 5 }],
    ]);
    const en = resolveSectionContent(definition('card-grid'), content, Locale.EN, media);
    expect(en).toEqual({
      heading: 'Gia tri',
      columns: '3',
      items: [
        {
          id: 'one',
          icon: 'rocket',
          image: {
            url: 'https://cdn/x.jpg',
            thumbnailUrl: null,
            width: 10,
            height: 5,
            alt: 'Anh vi',
          },
          imageAlt: 'Anh vi',
          title: 'Innovation',
        },
      ],
    });
  });
});
