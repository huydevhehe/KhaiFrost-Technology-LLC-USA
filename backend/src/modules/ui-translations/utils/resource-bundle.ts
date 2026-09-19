export type ResourceBundleValue = string | { [key: string]: ResourceBundleValue };
export type ResourceBundle = { [key: string]: ResourceBundleValue };

const MAX_DEPTH = 12;
const PLACEHOLDER_PATTERN = /\{\{\s*-?\s*([^{},\s]+)\s*(?:,[^{}]*)?\}\}/g;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Nested i18next JSON -> { 'a.b.c': 'text' }. Arrays become numeric path segments, null is skipped.
export function flattenResourceBundle(bundle: unknown): Record<string, string> {
  if (!isPlainObject(bundle)) {
    throw new Error('A resource bundle must be a JSON object');
  }
  const flat: Record<string, string> = {};
  const visit = (node: unknown, path: string, depth: number): void => {
    if (depth > MAX_DEPTH) throw new Error(`Resource bundle is nested deeper than ${MAX_DEPTH}`);
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      flat[path] = node;
    } else if (typeof node === 'number' || typeof node === 'boolean') {
      flat[path] = String(node);
    } else if (Array.isArray(node)) {
      node.forEach((item, index) =>
        visit(item, path ? `${path}.${index}` : String(index), depth + 1),
      );
    } else if (isPlainObject(node)) {
      for (const [key, child] of Object.entries(node)) {
        if (key === '' || key.includes('.')) {
          throw new Error(`Invalid key "${key}": keys must be non-empty and must not contain dots`);
        }
        visit(child, path ? `${path}.${key}` : key, depth + 1);
      }
    } else {
      throw new Error(`Unsupported value at "${path}"`);
    }
  };
  visit(bundle, '', 0);
  return flat;
}

export interface UnflattenResult {
  bundle: ResourceBundle;
  conflicts: string[];
}

// { 'a.b': 'x' } -> { a: { b: 'x' } }. A key that would turn an existing text into an object (or the reverse) is skipped and reported.
export function unflattenResourceBundleWithConflicts(
  flat: Record<string, string>,
): UnflattenResult {
  const bundle: ResourceBundle = {};
  const conflicts: string[] = [];
  for (const path of Object.keys(flat).sort()) {
    const segments = path.split('.');
    let cursor: ResourceBundle = bundle;
    let blocked = false;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const existing = cursor[segments[index]];
      if (existing === undefined) {
        const created: ResourceBundle = {};
        cursor[segments[index]] = created;
        cursor = created;
      } else if (typeof existing === 'string') {
        blocked = true;
        break;
      } else {
        cursor = existing;
      }
    }
    const leaf = segments[segments.length - 1];
    if (blocked || typeof cursor[leaf] === 'object') {
      conflicts.push(path);
      continue;
    }
    cursor[leaf] = flat[path];
  }
  return { bundle, conflicts };
}

export function unflattenResourceBundle(flat: Record<string, string>): ResourceBundle {
  return unflattenResourceBundleWithConflicts(flat).bundle;
}

// Variable names used by i18next interpolation, e.g. "Hi {{name}}" -> ['name']
export function extractPlaceholders(value: string | null | undefined): string[] {
  if (!value) return [];
  const names = new Set<string>();
  for (const match of value.matchAll(PLACEHOLDER_PATTERN)) names.add(match[1]);
  return [...names].sort();
}

export function placeholdersMatch(
  first: string | null | undefined,
  second: string | null | undefined,
): boolean {
  const left = extractPlaceholders(first);
  const right = extractPlaceholders(second);
  return left.length === right.length && left.every((name, index) => name === right[index]);
}
