import { EntityTarget, ObjectLiteral } from 'typeorm';
import { Locale } from '../../../common/enums/locale.enum';

export interface TranslationFieldDefinition {
  name: string;
  required: boolean;
}

// Describes one repeated block (stats, products, ...) so every block shares the same load / replace / validate code
export interface CollectionDefinition {
  key: string;
  item: EntityTarget<ObjectLiteral>;
  translation: EntityTarget<ObjectLiteral>;
  translationForeignKey: string;
  // True when rows carry a category id (null id = the services overview page)
  scoped: boolean;
  scalarFields: string[];
  arrayFields: string[];
  mediaFields: string[];
  translationFields: TranslationFieldDefinition[];
}

export type TranslationValues = Record<string, string | null>;

export type CollectionItemInput = Record<string, unknown> & {
  translations?: Partial<Record<Locale, Record<string, unknown> | undefined>>;
};

export interface CollectionItemRecord {
  id: string;
  sortOrder: number;
  fields: Record<string, unknown>;
  translations: Partial<Record<Locale, TranslationValues>>;
}
