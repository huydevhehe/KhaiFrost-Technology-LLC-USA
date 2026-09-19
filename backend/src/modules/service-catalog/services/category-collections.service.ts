import { Injectable } from '@nestjs/common';
import { EntityManager, In, IsNull, ObjectLiteral } from 'typeorm';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  CollectionDefinition,
  CollectionItemInput,
  CollectionItemRecord,
  TranslationValues,
} from './collection-definition';

export interface MissingTranslation {
  locale: string;
  field: string;
}

function isBlank(value: unknown): boolean {
  return (
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  );
}

@Injectable()
export class CategoryCollectionsService {
  async load(
    manager: EntityManager,
    definition: CollectionDefinition,
    ownerId: string | null,
  ): Promise<CollectionItemRecord[]> {
    const items = await manager.getRepository(definition.item).find({
      where: definition.scoped ? { categoryId: ownerId ?? IsNull() } : {},
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    if (items.length === 0) return [];

    const translationRows = await manager.getRepository(definition.translation).find({
      where: { [definition.translationForeignKey]: In(items.map((item) => item.id as string)) },
    });
    const byItem = new Map<string, Partial<Record<Locale, TranslationValues>>>();
    for (const row of translationRows) {
      const itemId = row[definition.translationForeignKey] as string;
      const values: TranslationValues = {};
      for (const field of definition.translationFields) {
        values[field.name] = (row[field.name] as string | null) ?? null;
      }
      const forItem = byItem.get(itemId) ?? {};
      forItem[row.locale as Locale] = values;
      byItem.set(itemId, forItem);
    }

    return items.map((item) => {
      const fields: Record<string, unknown> = {};
      for (const name of [
        ...definition.scalarFields,
        ...definition.arrayFields,
        ...definition.mediaFields,
      ]) {
        fields[name] = item[name] ?? null;
      }
      return {
        id: item.id as string,
        sortOrder: item.sortOrder as number,
        fields,
        translations: byItem.get(item.id as string) ?? {},
      };
    });
  }

  // Replaces the whole block: the array order becomes the display order
  async replace(
    manager: EntityManager,
    definition: CollectionDefinition,
    ownerId: string | null,
    inputs: CollectionItemInput[],
  ): Promise<void> {
    const itemRepository = manager.getRepository(definition.item);
    const existing = await itemRepository.find({
      select: { id: true },
      where: definition.scoped ? { categoryId: ownerId ?? IsNull() } : {},
    });
    if (existing.length > 0) {
      await itemRepository.delete(existing.map((item) => item.id as string));
    }
    if (inputs.length === 0) return;

    const itemRows = inputs.map((input, index) => {
      const row: ObjectLiteral = { sortOrder: index };
      if (definition.scoped) row.categoryId = ownerId;
      for (const name of definition.scalarFields) row[name] = input[name] ?? null;
      for (const name of definition.mediaFields) row[name] = input[name] ?? null;
      for (const name of definition.arrayFields) row[name] = input[name] ?? [];
      return itemRepository.create(row);
    });
    const savedItems = await itemRepository.save(itemRows);

    const translationRepository = manager.getRepository(definition.translation);
    const translationRows: ObjectLiteral[] = [];
    inputs.forEach((input, index) => {
      for (const locale of SUPPORTED_LOCALES) {
        const values = input.translations?.[locale];
        if (!values) continue;
        const row: ObjectLiteral = {
          [definition.translationForeignKey]: savedItems[index].id,
          locale,
        };
        for (const field of definition.translationFields) {
          const value = values[field.name];
          row[field.name] = isBlank(value) ? (field.required ? '' : null) : value;
        }
        translationRows.push(translationRepository.create(row));
      }
    });
    if (translationRows.length > 0) await translationRepository.save(translationRows);
  }

  collectMediaIds(definition: CollectionDefinition, inputs: CollectionItemInput[]): string[] {
    const ids: string[] = [];
    for (const input of inputs) {
      for (const name of definition.mediaFields) {
        const value = input[name];
        if (typeof value === 'string') ids.push(value);
      }
    }
    return ids;
  }

  findMissingTranslations(
    definition: CollectionDefinition,
    records: CollectionItemRecord[],
    pathPrefix: string,
  ): MissingTranslation[] {
    const missing: MissingTranslation[] = [];
    records.forEach((record, index) => {
      for (const locale of SUPPORTED_LOCALES) {
        for (const field of definition.translationFields) {
          if (!field.required) continue;
          if (isBlank(record.translations[locale]?.[field.name])) {
            missing.push({ locale, field: `${pathPrefix}[${index}].${field.name}` });
          }
        }
      }
    });
    return missing;
  }
}
