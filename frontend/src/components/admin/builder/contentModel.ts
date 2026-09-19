// Helpers around the section content shape the backend validator accepts:
//   { shared: { field, listKey: [{ id, ...shared }] },
//     translations: { vi: { field, listKey: { <itemId>: { field } } }, en: {...} } }
//
// Everything here is immutable: each writer returns a new content object.

import { LOCALES, type Locale } from "@/components/admin/shared";
import type {
  SectionContent,
  SectionFieldDefinition,
  SectionListItem,
  SectionTypeDefinition,
} from "@/lib/api/admin/pages";
import { describeUrlProblem } from "@/lib/api/admin/pages";

type Bag = Record<string, unknown>;

export function emptySectionContent(): SectionContent {
  return { shared: {}, translations: { vi: {}, en: {} } };
}

/** Defensive copy that also fills in both locale bags. */
export function normalizeContent(content: SectionContent | null | undefined): SectionContent {
  const source = content ?? emptySectionContent();
  const translations: Partial<Record<Locale, Bag>> = {};
  for (const locale of LOCALES) translations[locale] = { ...(source.translations?.[locale] ?? {}) };
  return { shared: { ...(source.shared ?? {}) }, translations };
}

export function readShared(content: SectionContent, key: string): unknown {
  return content.shared[key];
}

export function writeShared(content: SectionContent, key: string, value: unknown): SectionContent {
  const shared = { ...content.shared };
  if (value === undefined) delete shared[key];
  else shared[key] = value;
  return { ...content, shared };
}

export function readTranslated(content: SectionContent, locale: Locale, key: string): unknown {
  return content.translations[locale]?.[key];
}

export function writeTranslated(
  content: SectionContent,
  locale: Locale,
  key: string,
  value: unknown,
): SectionContent {
  const bag: Bag = { ...(content.translations[locale] ?? {}) };
  if (value === undefined) delete bag[key];
  else bag[key] = value;
  return { ...content, translations: { ...content.translations, [locale]: bag } };
}

/** Text value of a field as a string, for a controlled input. */
export function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

/** Ids accepted by the backend: letters, digits, dash and underscore. */
export function makeItemId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `i${Date.now().toString(36)}${random}`;
}

export function readList(content: SectionContent, key: string): SectionListItem[] {
  const value = content.shared[key];
  return Array.isArray(value) ? (value as SectionListItem[]) : [];
}

export function writeList(
  content: SectionContent,
  key: string,
  items: SectionListItem[],
): SectionContent {
  return writeShared(content, key, items);
}

export function readListText(
  content: SectionContent,
  locale: Locale,
  listKey: string,
  itemId: string,
  fieldKey: string,
): unknown {
  const perList = content.translations[locale]?.[listKey] as
    | Record<string, Bag>
    | undefined;
  return perList?.[itemId]?.[fieldKey];
}

export function writeListText(
  content: SectionContent,
  locale: Locale,
  listKey: string,
  itemId: string,
  fieldKey: string,
  value: unknown,
): SectionContent {
  const localeBag: Bag = { ...(content.translations[locale] ?? {}) };
  const perList: Record<string, Bag> = { ...((localeBag[listKey] as Record<string, Bag>) ?? {}) };
  const item: Bag = { ...(perList[itemId] ?? {}) };
  if (value === undefined) delete item[fieldKey];
  else item[fieldKey] = value;
  perList[itemId] = item;
  localeBag[listKey] = perList;
  return { ...content, translations: { ...content.translations, [locale]: localeBag } };
}

/** Appends an item with a fresh id. */
export function addListItem(content: SectionContent, listKey: string): SectionContent {
  const items = readList(content, listKey);
  return writeList(content, listKey, [...items, { id: makeItemId() }]);
}

/** Removes the item and every translation that referred to it. */
export function removeListItem(
  content: SectionContent,
  listKey: string,
  itemId: string,
): SectionContent {
  let next = writeList(
    content,
    listKey,
    readList(content, listKey).filter((item) => item.id !== itemId),
  );
  for (const locale of LOCALES) {
    const localeBag = next.translations[locale];
    const perList = localeBag?.[listKey] as Record<string, Bag> | undefined;
    if (!perList || !(itemId in perList)) continue;
    const copy = { ...perList };
    delete copy[itemId];
    next = writeTranslated(next, locale, listKey, copy);
  }
  return next;
}

export function moveListItem(
  content: SectionContent,
  listKey: string,
  index: number,
  delta: number,
): SectionContent {
  const items = [...readList(content, listKey)];
  const target = index + delta;
  if (target < 0 || target >= items.length) return content;
  const [moved] = items.splice(index, 1);
  items.splice(target, 0, moved);
  return writeList(content, listKey, items);
}

// ---------------------------------------------------------------------------
// Cleaning before a save
// ---------------------------------------------------------------------------

function cleanScalar(field: SectionFieldDefinition, value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (field.kind === "number") {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }
  if (field.kind === "boolean") return typeof value === "boolean" ? value : undefined;
  if (typeof value === "string") {
    const trimmed = field.kind === "richtext" ? value : value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
}

/**
 * Drops empty values and anything the section type does not declare, so the
 * request never trips the strict server-side validator.
 */
export function cleanContent(
  definition: SectionTypeDefinition,
  content: SectionContent,
): SectionContent {
  const shared: Bag = {};
  const listIds = new Map<string, Set<string>>();

  for (const field of definition.fields) {
    if (field.translatable) continue;
    if (field.kind === "list") {
      const items = readList(content, field.key);
      const ids = new Set<string>();
      const cleanedItems = items.map((item) => {
        const cleanedItem: SectionListItem = { id: String(item.id) };
        ids.add(cleanedItem.id);
        for (const itemField of field.itemFields ?? []) {
          if (itemField.translatable) continue;
          const cleaned = cleanScalar(itemField, item[itemField.key]);
          if (cleaned !== undefined) cleanedItem[itemField.key] = cleaned;
        }
        return cleanedItem;
      });
      listIds.set(field.key, ids);
      shared[field.key] = cleanedItems;
      continue;
    }
    const cleaned = cleanScalar(field, readShared(content, field.key));
    if (cleaned !== undefined) shared[field.key] = cleaned;
  }

  const translations: Partial<Record<Locale, Bag>> = {};
  for (const locale of LOCALES) {
    const bag: Bag = {};
    for (const field of definition.fields) {
      if (field.kind === "list") {
        const translatableItemFields = (field.itemFields ?? []).filter((item) => item.translatable);
        if (translatableItemFields.length === 0) continue;
        const perList: Record<string, Bag> = {};
        for (const itemId of listIds.get(field.key) ?? []) {
          const item: Bag = {};
          for (const itemField of translatableItemFields) {
            const cleaned = cleanScalar(
              itemField,
              readListText(content, locale, field.key, itemId, itemField.key),
            );
            if (cleaned !== undefined) item[itemField.key] = cleaned;
          }
          if (Object.keys(item).length > 0) perList[itemId] = item;
        }
        if (Object.keys(perList).length > 0) bag[field.key] = perList;
        continue;
      }
      if (!field.translatable) continue;
      const cleaned = cleanScalar(field, readTranslated(content, locale, field.key));
      if (cleaned !== undefined) bag[field.key] = cleaned;
    }
    translations[locale] = bag;
  }

  return { shared, translations };
}

// ---------------------------------------------------------------------------
// Client-side validation (mirrors section-content.validator.ts)
// ---------------------------------------------------------------------------

/** Validation messages keyed by the same field paths the server uses. */
export type ContentErrors = Record<string, string>;

const HTML_TAG_PATTERN = /<\s*\/?\s*[a-zA-Z!?]/;

function checkScalar(
  field: SectionFieldDefinition,
  value: unknown,
  path: string,
  errors: ContentErrors,
): void {
  if (value === undefined || value === null || value === "") return;
  if (field.kind === "text" || field.kind === "textarea") {
    const text = String(value).trim();
    const max = field.maxLength ?? (field.kind === "text" ? 300 : 2000);
    if (text.length > max) errors[path] = `Tối đa ${max} ký tự.`;
    else if (HTML_TAG_PATTERN.test(text)) errors[path] = "Không được chứa thẻ HTML.";
    else if (field.pattern && !new RegExp(field.pattern).test(text)) {
      errors[path] = "Giá trị không đúng định dạng.";
    }
    return;
  }
  if (field.kind === "url") {
    const problem = describeUrlProblem(String(value), field.urlPolicy);
    if (problem) errors[path] = problem;
    return;
  }
  if (field.kind === "number") {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) errors[path] = "Nhập một con số.";
    else if (field.integer && !Number.isInteger(parsed)) errors[path] = "Nhập số nguyên.";
    else if (field.min !== undefined && parsed < field.min) errors[path] = `Tối thiểu ${field.min}.`;
    else if (field.max !== undefined && parsed > field.max) errors[path] = `Tối đa ${field.max}.`;
  }
}

/** Format problems the server would reject; empty when the content can be saved. */
export function validateContent(
  definition: SectionTypeDefinition,
  content: SectionContent,
): ContentErrors {
  const errors: ContentErrors = {};
  for (const field of definition.fields) {
    if (field.kind === "list") {
      const items = readList(content, field.key);
      if (field.maxItems !== undefined && items.length > field.maxItems) {
        errors[`shared.${field.key}`] = `Tối đa ${field.maxItems} mục.`;
      }
      items.forEach((item, index) => {
        for (const itemField of field.itemFields ?? []) {
          const base = `shared.${field.key}[${index}].${itemField.key}`;
          if (itemField.translatable) {
            for (const locale of LOCALES) {
              checkScalar(
                itemField,
                readListText(content, locale, field.key, String(item.id), itemField.key),
                `translations.${locale}.${field.key}.${item.id}.${itemField.key}`,
                errors,
              );
            }
          } else {
            checkScalar(itemField, item[itemField.key], base, errors);
          }
        }
      });
      continue;
    }
    if (field.translatable) {
      for (const locale of LOCALES) {
        checkScalar(
          field,
          readTranslated(content, locale, field.key),
          `translations.${locale}.${field.key}`,
          errors,
        );
      }
    } else {
      checkScalar(field, readShared(content, field.key), `shared.${field.key}`, errors);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Publish gaps (mirrors findPublishGaps)
// ---------------------------------------------------------------------------

export interface PublishGap {
  /** `sectionKey.field` as the server reports it. */
  field: string;
  label: string;
  locale?: Locale;
}

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

/** What a visible section still lacks before the page can be published. */
export function findPublishGaps(
  definition: SectionTypeDefinition,
  content: SectionContent,
  prefix: string,
): PublishGap[] {
  const gaps: PublishGap[] = [];
  for (const field of definition.fields) {
    const name = `${prefix}.${field.key}`;
    if (field.kind === "list") {
      const items = readList(content, field.key);
      if (field.required && items.length === 0) {
        gaps.push({ field: name, label: field.label.vi });
      }
      items.forEach((item, index) => {
        for (const itemField of field.itemFields ?? []) {
          if (!itemField.required) continue;
          const itemName = `${name}[${String(item.id)}].${itemField.key}`;
          const label = `${field.label.vi} #${index + 1} · ${itemField.label.vi}`;
          if (!itemField.translatable) {
            if (!isFilled(item[itemField.key])) gaps.push({ field: itemName, label });
            continue;
          }
          for (const locale of LOCALES) {
            if (!isFilled(readListText(content, locale, field.key, String(item.id), itemField.key))) {
              gaps.push({ field: itemName, label, locale });
            }
          }
        }
      });
      continue;
    }
    if (!field.required) continue;
    if (!field.translatable) {
      if (!isFilled(readShared(content, field.key))) {
        gaps.push({ field: name, label: field.label.vi });
      }
      continue;
    }
    for (const locale of LOCALES) {
      if (!isFilled(readTranslated(content, locale, field.key))) {
        gaps.push({ field: name, label: field.label.vi, locale });
      }
    }
  }
  return gaps;
}

/** True when two contents are equal (used by the unsaved-changes guard). */
export function contentEquals(a: SectionContent, b: SectionContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
