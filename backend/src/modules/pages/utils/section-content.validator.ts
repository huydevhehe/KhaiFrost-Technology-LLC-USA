import { isUUID } from 'class-validator';
import { SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  ValidationErrorDetail,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { sanitizeRichText } from '../../../common/utils/sanitize-rich-text';
import {
  FieldDefinition,
  isTranslatedList,
  SectionTypeDefinition,
  VIDEO_HOST_ALLOW_LIST,
} from '../constants/section-types.registry';
import { SectionContent } from '../entities/page-section.entity';

export interface MediaReference {
  fieldKey: string;
  mediaAssetId: string;
}

export interface ValidatedSectionContent {
  content: SectionContent;
  mediaReferences: MediaReference[];
}

const ITEM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const HTML_TAG_PATTERN = /<\s*\/?\s*[a-zA-Z!?]/;
const DEFAULT_MAX_LENGTH: Record<string, number> = { text: 300, textarea: 2000 };
const MAX_RICH_TEXT_LENGTH = 50_000;
const MAX_URL_LENGTH = 2000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isSafeRelativeUrl(value: string): boolean {
  return /^\/(?!\/)[^\s\\]*$/.test(value) || /^#[^\s]*$/.test(value);
}

function isHttpUrl(value: string, httpsOnly: boolean): URL | null {
  if (/\s/.test(value)) return null;
  try {
    const parsed = new URL(value);
    const allowed = httpsOnly ? ['https:'] : ['http:', 'https:'];
    return allowed.includes(parsed.protocol) && parsed.hostname ? parsed : null;
  } catch {
    return null;
  }
}

class Collector {
  readonly errors: ValidationErrorDetail[] = [];
  readonly references = new Map<string, MediaReference>();

  fail(field: string, message: string): void {
    const existing = this.errors.find((error) => error.field === field);
    if (existing) existing.messages.push(message);
    else this.errors.push({ field, messages: [message] });
  }
}

// Returns the cleaned value, or undefined when the value counts as "not set"
function validateScalar(
  field: FieldDefinition,
  value: unknown,
  path: string,
  fieldKeyPath: string,
  collector: Collector,
): unknown {
  if (value === undefined || value === null) return undefined;
  switch (field.kind) {
    case 'text':
    case 'textarea': {
      if (typeof value !== 'string') return collector.fail(path, 'must be a string');
      const cleaned = value.trim();
      if (cleaned === '') return undefined;
      if (cleaned.length > (field.maxLength ?? DEFAULT_MAX_LENGTH[field.kind])) {
        return collector.fail(
          path,
          `must be at most ${field.maxLength ?? DEFAULT_MAX_LENGTH[field.kind]} characters`,
        );
      }
      if (HTML_TAG_PATTERN.test(cleaned)) return collector.fail(path, 'must not contain HTML');
      if (field.pattern && !new RegExp(field.pattern).test(cleaned)) {
        return collector.fail(path, 'has an invalid format');
      }
      return cleaned;
    }
    case 'richtext': {
      if (typeof value !== 'string') return collector.fail(path, 'must be a string');
      if (value.length > MAX_RICH_TEXT_LENGTH) {
        return collector.fail(path, `must be at most ${MAX_RICH_TEXT_LENGTH} characters`);
      }
      const cleaned = sanitizeRichText(value);
      return cleaned === '' ? undefined : cleaned;
    }
    case 'url': {
      if (typeof value !== 'string') return collector.fail(path, 'must be a string');
      const cleaned = value.trim();
      if (cleaned === '') return undefined;
      if (cleaned.length > MAX_URL_LENGTH) return collector.fail(path, 'is too long');
      if (field.urlPolicy === 'https-video') {
        const parsed = isHttpUrl(cleaned, true);
        if (!parsed || !VIDEO_HOST_ALLOW_LIST.includes(parsed.hostname.toLowerCase())) {
          return collector.fail(path, 'must be an https YouTube or Vimeo url');
        }
        return cleaned;
      }
      if (!isHttpUrl(cleaned, false) && !isSafeRelativeUrl(cleaned)) {
        return collector.fail(path, 'must be an http(s) url or a relative path');
      }
      return cleaned;
    }
    case 'media': {
      if (typeof value !== 'string' || !isUUID(value)) {
        return collector.fail(path, 'must be a media asset id');
      }
      collector.references.set(`${fieldKeyPath}:${value}`, {
        fieldKey: fieldKeyPath,
        mediaAssetId: value,
      });
      return value;
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return collector.fail(path, 'must be a number');
      }
      if (field.integer && !Number.isInteger(value))
        return collector.fail(path, 'must be an integer');
      if (field.min !== undefined && value < field.min) {
        return collector.fail(path, `must be at least ${field.min}`);
      }
      if (field.max !== undefined && value > field.max) {
        return collector.fail(path, `must be at most ${field.max}`);
      }
      return value;
    }
    case 'boolean':
      return typeof value === 'boolean' ? value : collector.fail(path, 'must be true or false');
    case 'select':
      return typeof value === 'string' && field.options?.includes(value)
        ? value
        : collector.fail(path, `must be one of: ${field.options?.join(', ')}`);
    default:
      return collector.fail(path, 'unsupported field kind');
  }
}

function findField(fields: FieldDefinition[], key: string): FieldDefinition | undefined {
  return fields.find((field) => field.key === key);
}

function validateSharedList(
  field: FieldDefinition,
  value: unknown,
  path: string,
  collector: Collector,
): Record<string, unknown>[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    collector.fail(path, 'must be a list');
    return undefined;
  }
  if (value.length > (field.maxItems ?? 50)) {
    collector.fail(path, `must have at most ${field.maxItems ?? 50} items`);
    return undefined;
  }
  const itemFields = field.itemFields ?? [];
  const seenIds = new Set<string>();
  const items: Record<string, unknown>[] = [];
  value.forEach((raw, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isPlainObject(raw)) {
      collector.fail(itemPath, 'must be an object');
      return;
    }
    const item: Record<string, unknown> = {};
    const id = raw.id;
    if (typeof id !== 'string' || !ITEM_ID_PATTERN.test(id)) {
      collector.fail(
        `${itemPath}.id`,
        'must be a stable id of letters, digits, dash or underscore',
      );
    } else if (seenIds.has(id)) {
      collector.fail(`${itemPath}.id`, 'must be unique within the list');
    } else {
      seenIds.add(id);
      item.id = id;
    }
    for (const [key, itemValue] of Object.entries(raw)) {
      if (key === 'id') continue;
      const itemField = findField(itemFields, key);
      if (!itemField) {
        collector.fail(`${itemPath}.${key}`, 'unknown field');
      } else if (itemField.translatable) {
        collector.fail(`${itemPath}.${key}`, 'is translatable; place it under translations');
      } else {
        const cleaned = validateScalar(
          itemField,
          itemValue,
          `${itemPath}.${key}`,
          `${field.key}[].${key}`,
          collector,
        );
        if (cleaned !== undefined) item[key] = cleaned;
      }
    }
    items.push(item);
  });
  return items;
}

function validateTranslatedList(
  field: FieldDefinition,
  value: unknown,
  path: string,
  knownIds: Set<string>,
  collector: Collector,
): Record<string, Record<string, unknown>> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) {
    collector.fail(path, 'must be an object keyed by item id');
    return undefined;
  }
  const itemFields = field.itemFields ?? [];
  const result: Record<string, Record<string, unknown>> = {};
  for (const [id, raw] of Object.entries(value)) {
    const itemPath = `${path}.${id}`;
    if (!knownIds.has(id)) {
      collector.fail(itemPath, 'refers to an item id that is not in the list');
      continue;
    }
    if (!isPlainObject(raw)) {
      collector.fail(itemPath, 'must be an object');
      continue;
    }
    const item: Record<string, unknown> = {};
    for (const [key, itemValue] of Object.entries(raw)) {
      const itemField = findField(itemFields, key);
      if (!itemField) {
        collector.fail(`${itemPath}.${key}`, 'unknown field');
      } else if (!itemField.translatable) {
        collector.fail(`${itemPath}.${key}`, 'is not translatable; place it under shared');
      } else {
        const cleaned = validateScalar(itemField, itemValue, `${itemPath}.${key}`, key, collector);
        if (cleaned !== undefined) item[key] = cleaned;
      }
    }
    if (Object.keys(item).length > 0) result[id] = item;
  }
  return result;
}

// Strict validation: unknown fields, misplaced fields, bad urls, scripts and bad media ids are all rejected
export function validateSectionContent(
  definition: SectionTypeDefinition,
  input: unknown,
): ValidatedSectionContent {
  const collector = new Collector();
  const source = input === undefined || input === null ? {} : input;
  const content: SectionContent = { shared: {}, translations: {} };

  if (!isPlainObject(source)) {
    throw validationFailed([{ field: 'content', messages: ['must be an object'] }]);
  }
  for (const key of Object.keys(source)) {
    if (key !== 'shared' && key !== 'translations') {
      collector.fail(`content.${key}`, 'unknown property; use shared and translations');
    }
  }

  const sharedInput = source.shared ?? {};
  if (!isPlainObject(sharedInput)) {
    collector.fail('shared', 'must be an object');
  } else {
    for (const [key, value] of Object.entries(sharedInput)) {
      const field = findField(definition.fields, key);
      const path = `shared.${key}`;
      if (!field) {
        collector.fail(path, 'unknown field');
      } else if (field.translatable) {
        collector.fail(path, 'is translatable; place it under translations');
      } else if (field.kind === 'list') {
        const items = validateSharedList(field, value, path, collector);
        if (items !== undefined) content.shared[key] = items;
      } else {
        const cleaned = validateScalar(field, value, path, key, collector);
        if (cleaned !== undefined) content.shared[key] = cleaned;
      }
    }
  }

  const translationsInput = source.translations ?? {};
  if (!isPlainObject(translationsInput)) {
    collector.fail('translations', 'must be an object');
  } else {
    for (const [locale, localeValue] of Object.entries(translationsInput)) {
      const localePath = `translations.${locale}`;
      if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
        collector.fail(localePath, 'unsupported locale');
        continue;
      }
      if (!isPlainObject(localeValue)) {
        collector.fail(localePath, 'must be an object');
        continue;
      }
      const cleanedLocale: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(localeValue)) {
        const field = findField(definition.fields, key);
        const path = `${localePath}.${key}`;
        if (!field) {
          collector.fail(path, 'unknown field');
        } else if (isTranslatedList(field)) {
          const sharedList = content.shared[key];
          const knownIds = new Set(
            Array.isArray(sharedList) ? sharedList.map((item) => String(item.id)) : [],
          );
          const cleaned = validateTranslatedList(field, value, path, knownIds, collector);
          if (cleaned !== undefined) cleanedLocale[key] = cleaned;
        } else if (!field.translatable) {
          collector.fail(path, 'is not translatable; place it under shared');
        } else {
          const cleaned = validateScalar(field, value, path, key, collector);
          if (cleaned !== undefined) cleanedLocale[key] = cleaned;
        }
      }
      (content.translations as Record<string, Record<string, unknown>>)[locale] = cleanedLocale;
    }
  }

  if (collector.errors.length > 0) throw validationFailed(collector.errors);
  return { content, mediaReferences: [...collector.references.values()] };
}

// Media ids of already stored content (draft or published), with the field path used for usage tracking
export function extractMediaReferences(
  definition: SectionTypeDefinition,
  content: SectionContent | null,
): MediaReference[] {
  if (!content) return [];
  const references = new Map<string, MediaReference>();
  const add = (fieldKey: string, value: unknown) => {
    if (typeof value === 'string')
      references.set(`${fieldKey}:${value}`, { fieldKey, mediaAssetId: value });
  };
  for (const field of definition.fields) {
    if (field.kind === 'media') add(field.key, content.shared[field.key]);
    if (field.kind === 'list') {
      const items = content.shared[field.key];
      if (!Array.isArray(items)) continue;
      for (const item of items as Record<string, unknown>[]) {
        for (const itemField of field.itemFields ?? []) {
          if (itemField.kind === 'media')
            add(`${field.key}[].${itemField.key}`, item[itemField.key]);
        }
      }
    }
  }
  return [...references.values()];
}

export interface PublishGaps {
  missingRequired: { field: string }[];
  missingTranslations: { locale: string; field: string }[];
}

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

// What a visible section still lacks before it can go live
export function findPublishGaps(
  definition: SectionTypeDefinition,
  content: SectionContent,
  prefix: string,
): PublishGaps {
  const gaps: PublishGaps = { missingRequired: [], missingTranslations: [] };
  const translationsOf = (locale: string): Record<string, unknown> =>
    ((content.translations as Record<string, Record<string, unknown>>)[locale] ?? {}) as Record<
      string,
      unknown
    >;

  for (const field of definition.fields) {
    const name = `${prefix}.${field.key}`;
    if (field.kind === 'list') {
      const items = (content.shared[field.key] as Record<string, unknown>[] | undefined) ?? [];
      if (field.required && items.length === 0) gaps.missingRequired.push({ field: name });
      for (const item of items) {
        for (const itemField of field.itemFields ?? []) {
          if (!itemField.required) continue;
          const itemName = `${name}[${String(item.id)}].${itemField.key}`;
          if (!itemField.translatable) {
            if (!isFilled(item[itemField.key])) gaps.missingRequired.push({ field: itemName });
            continue;
          }
          for (const locale of SUPPORTED_LOCALES) {
            const perItem = (
              translationsOf(locale)[field.key] as
                Record<string, Record<string, unknown>> | undefined
            )?.[String(item.id)];
            if (!isFilled(perItem?.[itemField.key])) {
              gaps.missingTranslations.push({ locale, field: itemName });
            }
          }
        }
      }
      continue;
    }
    if (!field.required) continue;
    if (!field.translatable) {
      if (!isFilled(content.shared[field.key])) gaps.missingRequired.push({ field: name });
      continue;
    }
    for (const locale of SUPPORTED_LOCALES) {
      if (!isFilled(translationsOf(locale)[field.key])) {
        gaps.missingTranslations.push({ locale, field: name });
      }
    }
  }
  return gaps;
}
