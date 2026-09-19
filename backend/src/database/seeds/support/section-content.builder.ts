import { SourceLocalizedText } from './source-content.types';

export type LocalizedTexts = Record<string, SourceLocalizedText | undefined>;

export interface ListItemSpec {
  id: string;
  shared?: Record<string, unknown>;
  text?: LocalizedTexts;
}

export interface SectionContentSpec {
  text?: LocalizedTexts;
  shared?: Record<string, unknown>;
  lists?: Record<string, ListItemSpec[]>;
}

export type SectionContentInput = {
  shared: Record<string, unknown>;
  translations: { vi: Record<string, unknown>; en: Record<string, unknown> };
};

export function joinLines(
  first: SourceLocalizedText,
  second: SourceLocalizedText,
): SourceLocalizedText {
  return { vi: `${first.vi} ${second.vi}`, en: `${first.en} ${second.en}` };
}

function present(record: Record<string, unknown> | undefined): [string, unknown][] {
  return Object.entries(record ?? {}).filter(([, value]) => value !== undefined && value !== null);
}

// Splits a section into the registry's `shared` (language independent) and per language `translations` parts
export function buildSectionContent(spec: SectionContentSpec): SectionContentInput {
  const shared: Record<string, unknown> = Object.fromEntries(present(spec.shared));
  const vi: Record<string, unknown> = {};
  const en: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(spec.text ?? {})) {
    if (!value) continue;
    vi[key] = value.vi;
    en[key] = value.en;
  }

  for (const [listKey, items] of Object.entries(spec.lists ?? {})) {
    shared[listKey] = items.map((item) => ({
      id: item.id,
      ...Object.fromEntries(present(item.shared)),
    }));
    const viItems: Record<string, Record<string, unknown>> = {};
    const enItems: Record<string, Record<string, unknown>> = {};
    for (const item of items) {
      const viFields: Record<string, unknown> = {};
      const enFields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(item.text ?? {})) {
        if (!value) continue;
        viFields[key] = value.vi;
        enFields[key] = value.en;
      }
      if (Object.keys(viFields).length > 0) viItems[item.id] = viFields;
      if (Object.keys(enFields).length > 0) enItems[item.id] = enFields;
    }
    vi[listKey] = viItems;
    en[listKey] = enItems;
  }
  return { shared, translations: { vi, en } };
}
