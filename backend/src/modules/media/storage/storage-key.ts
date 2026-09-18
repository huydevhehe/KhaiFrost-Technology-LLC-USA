import { randomUUID } from 'node:crypto';

// Every segment starts with an alphanumeric: no dot segments, drive letters, backslashes or spaces
const STORAGE_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;
const MAX_STORAGE_KEY_LENGTH = 300;

export function isValidStorageKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key.length > 0 &&
    key.length <= MAX_STORAGE_KEY_LENGTH &&
    STORAGE_KEY_PATTERN.test(key)
  );
}

// Every stored file of one asset shares this server generated base: yyyy/mm/<uuid>
export function createStorageKeyBase(now: Date = new Date()): string {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}/${month}/${randomUUID()}`;
}

export function buildStorageKey(base: string, extension: string, variantName?: string): string {
  return variantName ? `${base}_${variantName}.${extension}` : `${base}.${extension}`;
}
