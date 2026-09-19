import { QueryFailedError } from 'typeorm';
import { ApplicationException } from '../../../common/exceptions/application.exception';
import { executeWithUniqueSlug } from './unique-slug-execution';

const INDEX = 'uq_posts_slug';

function uniqueViolation(constraint = INDEX): QueryFailedError {
  return new QueryFailedError(
    'insert',
    [],
    Object.assign(new Error('duplicate'), { code: '23505', constraint }),
  );
}

describe('executeWithUniqueSlug', () => {
  it('uses a generated slug when it is free', async () => {
    const execute = jest.fn(async (slug: string) => slug);
    const result = await executeWithUniqueSlug({
      sourceText: 'Xin chào thế giới',
      uniqueIndexName: INDEX,
      isTaken: async () => false,
      execute,
    });
    expect(result).toBe('xin-chao-the-gioi');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('appends a numeric suffix when the base slug is taken', async () => {
    const taken = new Set(['bai-viet']);
    const result = await executeWithUniqueSlug({
      sourceText: 'Bài viết',
      uniqueIndexName: INDEX,
      isTaken: async (slug) => taken.has(slug),
      execute: async (slug) => slug,
    });
    expect(result).toBe('bai-viet-2');
  });

  it('never hands out a reserved slug', async () => {
    const result = await executeWithUniqueSlug({
      sourceText: 'Slugs',
      uniqueIndexName: INDEX,
      isTaken: async () => false,
      execute: async (slug) => slug,
    });
    expect(result).toBe('slugs-2');
  });

  it('retries once with a fresh slug when another request wins the race', async () => {
    const taken = new Set<string>();
    let calls = 0;
    const result = await executeWithUniqueSlug({
      sourceText: 'Same title',
      uniqueIndexName: INDEX,
      isTaken: async (slug) => taken.has(slug),
      execute: async (slug) => {
        calls += 1;
        if (calls === 1) {
          taken.add(slug);
          throw uniqueViolation();
        }
        return slug;
      },
    });
    expect(result).toBe('same-title-2');
    expect(calls).toBe(2);
  });

  it('gives up with SLUG_TAKEN after the retry also collides', async () => {
    await expect(
      executeWithUniqueSlug({
        sourceText: 'Busy',
        uniqueIndexName: INDEX,
        isTaken: async () => false,
        execute: async () => {
          throw uniqueViolation();
        },
      }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN' });
  });

  it('rejects a supplied slug that is taken or reserved with 409 SLUG_TAKEN', async () => {
    for (const suppliedSlug of ['taken-one', 'slugs']) {
      const error = await executeWithUniqueSlug({
        suppliedSlug,
        sourceText: 'x',
        uniqueIndexName: INDEX,
        isTaken: async (slug) => slug === 'taken-one',
        execute: async (slug) => slug,
      }).catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ApplicationException);
      expect((error as ApplicationException).code).toBe('SLUG_TAKEN');
      expect((error as ApplicationException).getStatus()).toBe(409);
    }
  });

  it('maps a lost race on a supplied slug to SLUG_TAKEN and rethrows unrelated errors', async () => {
    await expect(
      executeWithUniqueSlug({
        suppliedSlug: 'mine',
        sourceText: 'x',
        uniqueIndexName: INDEX,
        isTaken: async () => false,
        execute: async () => {
          throw uniqueViolation();
        },
      }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN' });

    await expect(
      executeWithUniqueSlug({
        sourceText: 'x',
        uniqueIndexName: INDEX,
        isTaken: async () => false,
        execute: async () => {
          throw uniqueViolation('some_other_index');
        },
      }),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });
});
