import {
  computeReadingTimeMinutes,
  deriveExcerpt,
  normalizeTags,
  toPlainText,
} from './post-content';

describe('post content helpers', () => {
  describe('toPlainText', () => {
    it('removes markup and scripts but keeps readable characters', () => {
      expect(toPlainText('<b>AI</b> & Cloud <script>alert(1)</script>')).toBe('AI & Cloud');
      expect(toPlainText('a < b')).toBe('a < b');
    });
  });

  describe('computeReadingTimeMinutes', () => {
    it('is at least one minute for empty or short content', () => {
      expect(computeReadingTimeMinutes('')).toBe(1);
      expect(computeReadingTimeMinutes('<p>Hello world</p>')).toBe(1);
    });

    it('rounds up at 200 words per minute and ignores markup', () => {
      const words = (count: number) => Array.from({ length: count }, () => 'word').join(' ');
      expect(computeReadingTimeMinutes(`<p>${words(200)}</p>`)).toBe(1);
      expect(computeReadingTimeMinutes(`<p>${words(201)}</p>`)).toBe(2);
      expect(
        computeReadingTimeMinutes(`<h2>${words(300)}</h2><p><strong>${words(500)}</strong></p>`),
      ).toBe(4);
    });
  });

  describe('deriveExcerpt', () => {
    it('returns short text untouched and strips tags', () => {
      expect(deriveExcerpt('<p>Short <b>text</b></p>')).toBe('Short text');
    });

    it('cuts long text at a word boundary with an ellipsis', () => {
      const long = `<p>${Array.from({ length: 100 }, () => 'alpha').join(' ')}</p>`;
      const excerpt = deriveExcerpt(long);
      expect(excerpt.length).toBeLessThanOrEqual(201);
      expect(excerpt.endsWith('…')).toBe(true);
      expect(excerpt).toMatch(/^(alpha )*alpha…$/);
    });
  });

  describe('normalizeTags', () => {
    it('trims, drops blanks, removes case-insensitive duplicates and markup', () => {
      expect(normalizeTags([' AI ', 'ai', '', '<b>Cloud</b>', 'Cloud'])).toEqual(['AI', 'Cloud']);
    });

    it('caps the number of tags', () => {
      const many = Array.from({ length: 40 }, (_, i) => `tag${i}`);
      expect(normalizeTags(many)).toHaveLength(20);
    });
  });
});
