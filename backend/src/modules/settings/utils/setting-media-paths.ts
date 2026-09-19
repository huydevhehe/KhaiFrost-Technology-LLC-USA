import { Locale } from '../../../common/enums/locale.enum';

// A media field points at a MediaAsset id inside a group value, e.g. 'logoId' or 'offices[].imageId'
export interface MediaFieldSpec {
  path: string;
  // Key that carries the resolved media in the public payload
  outputKey: string;
}

export interface MediaReference {
  fieldKey: string;
  mediaAssetId: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function visitLeaves(
  node: unknown,
  segments: string[],
  visit: (holder: Record<string, unknown>, key: string) => void,
): void {
  if (!isPlainObject(node) || segments.length === 0) return;
  const [segment, ...rest] = segments;
  const isList = segment.endsWith('[]');
  const key = isList ? segment.slice(0, -2) : segment;
  if (rest.length === 0) {
    visit(node, key);
    return;
  }
  const child = node[key];
  if (isList && Array.isArray(child)) {
    for (const item of child) visitLeaves(item, rest, visit);
  } else {
    visitLeaves(child, rest, visit);
  }
}

export function collectMediaReferences(
  value: Record<string, unknown>,
  specs: readonly MediaFieldSpec[],
): MediaReference[] {
  const references = new Map<string, MediaReference>();
  for (const spec of specs) {
    visitLeaves(value, spec.path.split('.'), (holder, key) => {
      const id = holder[key];
      if (typeof id === 'string') {
        references.set(`${spec.path}:${id}`, { fieldKey: spec.path, mediaAssetId: id });
      }
    });
  }
  return [...references.values()];
}

// Returns a copy where every media id key is replaced by the resolved media under `outputKey`
export function resolveMediaFields<T>(
  value: Record<string, unknown>,
  specs: readonly MediaFieldSpec[],
  resolve: (mediaAssetId: string) => T | null,
): Record<string, unknown> {
  const copy = structuredClone(value);
  for (const spec of specs) {
    const segments = spec.path.split('.');
    visitLeaves(copy, segments, (holder, key) => {
      const id = holder[key];
      delete holder[key];
      holder[spec.outputKey] = typeof id === 'string' ? resolve(id) : null;
    });
  }
  return copy;
}

function isLocalizedText(value: unknown): value is Partial<Record<Locale, string>> {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((key) => key === Locale.VI || key === Locale.EN) &&
    Object.values(value).every((text) => typeof text === 'string')
  );
}

// Collapses every { vi, en } object to the text of one locale (falls back to the default locale)
export function localizeValue(value: unknown, locale: Locale, fallback: Locale): unknown {
  if (Array.isArray(value)) return value.map((item) => localizeValue(item, locale, fallback));
  if (isLocalizedText(value)) return value[locale] ?? value[fallback] ?? '';
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, localizeValue(child, locale, fallback)]),
    );
  }
  return value;
}
