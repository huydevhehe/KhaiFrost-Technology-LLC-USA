import { conflict } from '../../../common/exceptions/exception.factories';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { generateUniqueSlug } from '../../../common/utils/unique-slug';
import { PostErrorCode } from '../constants/post-error-codes';

// "slugs" is the public route that lists every slug, so no article may use it
export const RESERVED_SLUGS: ReadonlySet<string> = new Set(['slugs']);

export interface UniqueSlugExecution<Result> {
  suppliedSlug?: string;
  sourceText: string;
  uniqueIndexName: string;
  isTaken: (slug: string) => Promise<boolean>;
  execute: (slug: string) => Promise<Result>;
}

function slugTaken(slug: string): never {
  throw conflict(PostErrorCode.SLUG_TAKEN, `The slug "${slug}" is already in use`, { slug });
}

// The unique index is the final arbiter: a lost race is retried once with a fresh suggestion
export async function executeWithUniqueSlug<Result>(
  options: UniqueSlugExecution<Result>,
): Promise<Result> {
  const { suppliedSlug, sourceText, uniqueIndexName, isTaken, execute } = options;
  const taken = async (slug: string) => RESERVED_SLUGS.has(slug) || (await isTaken(slug));

  if (suppliedSlug) {
    if (await taken(suppliedSlug)) slugTaken(suppliedSlug);
    try {
      return await execute(suppliedSlug);
    } catch (error) {
      if (isUniqueViolation(error, uniqueIndexName)) slugTaken(suppliedSlug);
      throw error;
    }
  }

  let lastSlug = sourceText;
  for (let attempt = 0; attempt < 2; attempt++) {
    lastSlug = await generateUniqueSlug(sourceText, taken);
    try {
      return await execute(lastSlug);
    } catch (error) {
      if (!isUniqueViolation(error, uniqueIndexName)) throw error;
    }
  }
  return slugTaken(lastSlug);
}
