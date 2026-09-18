import { generateUniqueSlug } from './unique-slug';

describe('generateUniqueSlug', () => {
  it('returns the base slug when free', async () => {
    await expect(generateUniqueSlug('Máy nén khí', async () => false)).resolves.toBe('may-nen-khi');
  });

  it('appends a numeric suffix on collision', async () => {
    const taken = new Set(['may-nen-khi', 'may-nen-khi-2']);
    await expect(generateUniqueSlug('Máy nén khí', async (slug) => taken.has(slug))).resolves.toBe(
      'may-nen-khi-3',
    );
  });

  it('falls back to a random suffix after too many collisions', async () => {
    const slug = await generateUniqueSlug(
      'a',
      async (candidate) => !/-[0-9a-f]{6}$/.test(candidate),
      {
        maxAttempts: 3,
      },
    );
    expect(slug).toMatch(/^a-[0-9a-f]{6}$/);
  });
});
