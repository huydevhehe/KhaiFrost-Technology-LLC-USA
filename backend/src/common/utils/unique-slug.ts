import { randomBytes } from 'node:crypto';
import { slugify } from './slugify';

export interface UniqueSlugOptions {
  maxAttempts?: number;
  maxLength?: number;
  fallback?: string;
}

// The unique DB index stays the final arbiter: on 23505 the caller should call this again
export async function generateUniqueSlug(
  text: string,
  isSlugTaken: (slug: string) => Promise<boolean>,
  options: UniqueSlugOptions = {},
): Promise<string> {
  const { maxAttempts = 20, maxLength = 200, fallback = 'item' } = options;
  const base = slugify(text).slice(0, maxLength).replace(/-+$/, '') || fallback;

  if (!(await isSlugTaken(base))) return base;

  for (let suffix = 2; suffix <= maxAttempts; suffix++) {
    const tail = `-${suffix}`;
    const candidate = `${base.slice(0, maxLength - tail.length)}${tail}`;
    if (!(await isSlugTaken(candidate))) return candidate;
  }

  const tail = `-${randomBytes(3).toString('hex')}`;
  return `${base.slice(0, maxLength - tail.length)}${tail}`;
}
