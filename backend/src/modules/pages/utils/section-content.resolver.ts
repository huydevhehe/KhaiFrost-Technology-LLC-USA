import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';
import { FieldDefinition, SectionTypeDefinition } from '../constants/section-types.registry';
import { SectionContent } from '../entities/page-section.entity';

export interface MediaFile {
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface ResolvedMedia extends MediaFile {
  alt: string | null;
}

type TextBag = Record<string, unknown>;

function localeBag(content: SectionContent, locale: string): TextBag {
  return ((content.translations as Record<string, TextBag>)[locale] ?? {}) as TextBag;
}

function pickText(
  content: SectionContent,
  locale: Locale,
  read: (bag: TextBag) => unknown,
): unknown {
  return read(localeBag(content, locale)) ?? read(localeBag(content, DEFAULT_LOCALE));
}

function resolveMedia(
  id: unknown,
  media: ReadonlyMap<string, MediaFile>,
  alt: unknown,
): ResolvedMedia | null {
  const file = typeof id === 'string' ? media.get(id) : undefined;
  if (!file) return null;
  return { ...file, alt: typeof alt === 'string' ? alt : null };
}

// Flattens { shared, translations } to one locale: media become objects, list items merge both halves
export function resolveSectionContent(
  definition: SectionTypeDefinition,
  content: SectionContent,
  locale: Locale,
  media: ReadonlyMap<string, MediaFile>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  const resolveScalar = (field: FieldDefinition, value: unknown, altValue: unknown): unknown =>
    field.kind === 'media' ? resolveMedia(value, media, altValue) : value;

  for (const field of definition.fields) {
    if (field.kind === 'list') {
      const items = (content.shared[field.key] as Record<string, unknown>[] | undefined) ?? [];
      output[field.key] = items.map((item) => {
        const merged: Record<string, unknown> = { id: item.id };
        const texts = (id: string, key: string) =>
          pickText(
            content,
            locale,
            (bag) => (bag[field.key] as Record<string, TextBag> | undefined)?.[id]?.[key],
          );
        for (const itemField of field.itemFields ?? []) {
          const value = itemField.translatable
            ? texts(String(item.id), itemField.key)
            : item[itemField.key];
          if (value === undefined) continue;
          const altValue = itemField.altFieldKey
            ? texts(String(item.id), itemField.altFieldKey)
            : undefined;
          merged[itemField.key] = resolveScalar(itemField, value, altValue);
        }
        return merged;
      });
      continue;
    }
    const value = field.translatable
      ? pickText(content, locale, (bag) => bag[field.key])
      : content.shared[field.key];
    if (value === undefined) continue;
    const altValue = field.altFieldKey
      ? pickText(content, locale, (bag) => bag[field.altFieldKey as string])
      : undefined;
    output[field.key] = resolveScalar(field, value, altValue);
  }
  return output;
}

// Media ids used by a stored content, for one batched lookup
export function collectContentMediaIds(
  definition: SectionTypeDefinition,
  content: SectionContent,
): string[] {
  const ids: string[] = [];
  for (const field of definition.fields) {
    if (field.kind === 'media' && typeof content.shared[field.key] === 'string') {
      ids.push(content.shared[field.key] as string);
    }
    if (field.kind === 'list') {
      const items = (content.shared[field.key] as Record<string, unknown>[] | undefined) ?? [];
      for (const item of items) {
        for (const itemField of field.itemFields ?? []) {
          if (itemField.kind === 'media' && typeof item[itemField.key] === 'string') {
            ids.push(item[itemField.key] as string);
          }
        }
      }
    }
  }
  return ids;
}
