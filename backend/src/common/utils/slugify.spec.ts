import { slugify } from './slugify';

describe('slugify', () => {
  it('strips Vietnamese diacritics', () => {
    expect(slugify('Hệ thống lạnh công nghiệp')).toBe('he-thong-lanh-cong-nghiep');
  });

  it('handles d with stroke in both cases', () => {
    expect(slugify('Đường đi')).toBe('duong-di');
    expect(slugify('ĐẠI ĐỒNG')).toBe('dai-dong');
  });

  it('collapses punctuation and whitespace into single hyphens', () => {
    expect(slugify('  Hello,   World!! -- 2026 ')).toBe('hello-world-2026');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('');
  });
});
