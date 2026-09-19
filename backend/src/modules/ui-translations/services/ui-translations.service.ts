import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { Locale } from '../../../common/enums/locale.enum';
import {
  conflict,
  notFound,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { containsPattern, escapeLikePattern } from '../../../common/utils/escape-like-pattern';
import {
  CreateUiTranslationDto,
  UI_TRANSLATION_KEY_PATTERN,
  UI_TRANSLATION_NAMESPACE_PATTERN,
} from '../dto/create-ui-translation.dto';
import { ImportResourceBundleResultDto } from '../dto/import-resource-bundle.dto';
import {
  ListMissingUiTranslationsQueryDto,
  ListUiTranslationsQueryDto,
  MissingLocaleFilter,
} from '../dto/list-ui-translations-query.dto';
import { UpdateUiTranslationDto } from '../dto/update-ui-translation.dto';
import {
  UiTranslationNamespaceSummaryDto,
  UiTranslationResponseDto,
} from '../dto/ui-translation-response.dto';
import { UiTranslation } from '../entities/ui-translation.entity';
import { toUiTranslationResponse } from '../mappers/ui-translation.mapper';
import { flattenResourceBundle, placeholdersMatch } from '../utils/resource-bundle';

const SORTABLE_FIELDS = ['namespace', 'key', 'createdAt', 'updatedAt'] as const;
const IMPORT_CHUNK_SIZE = 200;
const MAX_IMPORT_KEYS = 20_000;
export const DEFAULT_UI_NAMESPACE = 'translation';

export interface ImportResourceBundleOptions {
  overwrite?: boolean;
  namespace?: string;
  // Seeding marks the keys the frontend code depends on as system keys
  markAsSystem?: boolean;
}

function normalizeValue(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === '') return null;
  return value;
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim() === '';
}

@Injectable()
export class UiTranslationsService {
  constructor(
    @InjectRepository(UiTranslation) private readonly translations: Repository<UiTranslation>,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    query: ListUiTranslationsQueryDto,
  ): Promise<PaginatedResponseDto<UiTranslationResponseDto>> {
    const builder = this.translations.createQueryBuilder('t');
    this.applyFilters(builder, query.namespace, query.search);
    if (query.missing === MissingLocaleFilter.VI) builder.andWhere(this.blankCondition('valueVi'));
    else if (query.missing === MissingLocaleFilter.EN)
      builder.andWhere(this.blankCondition('valueEn'));
    else if (query.missing === MissingLocaleFilter.ANY) {
      builder.andWhere(`(${this.blankCondition('valueVi')} OR ${this.blankCondition('valueEn')})`);
    }
    this.applySort(builder, query);
    return paginate(builder, query, toUiTranslationResponse);
  }

  async listMissing(
    query: ListMissingUiTranslationsQueryDto,
  ): Promise<PaginatedResponseDto<UiTranslationResponseDto>> {
    const builder = this.translations.createQueryBuilder('t');
    this.applyFilters(builder, query.namespace, query.search);
    if (query.locale === Locale.VI) builder.andWhere(this.blankCondition('valueVi'));
    else if (query.locale === Locale.EN) builder.andWhere(this.blankCondition('valueEn'));
    else
      builder.andWhere(`(${this.blankCondition('valueVi')} OR ${this.blankCondition('valueEn')})`);
    this.applySort(builder, query);
    return paginate(builder, query, toUiTranslationResponse);
  }

  async listNamespaces(): Promise<UiTranslationNamespaceSummaryDto[]> {
    const rows = await this.translations
      .createQueryBuilder('t')
      .select('t.namespace', 'namespace')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE ${this.blankCondition('valueVi')})`, 'missingVi')
      .addSelect(`COUNT(*) FILTER (WHERE ${this.blankCondition('valueEn')})`, 'missingEn')
      .groupBy('t.namespace')
      .orderBy('t.namespace', 'ASC')
      .getRawMany<{ namespace: string; total: string; missingVi: string; missingEn: string }>();
    return rows.map((row) => ({
      namespace: row.namespace,
      total: Number(row.total),
      missingVi: Number(row.missingVi),
      missingEn: Number(row.missingEn),
    }));
  }

  async findOne(id: string): Promise<UiTranslationResponseDto> {
    return toUiTranslationResponse(await this.getOrFail(id));
  }

  async create(dto: CreateUiTranslationDto): Promise<UiTranslationResponseDto> {
    const valueVi = normalizeValue(dto.valueVi) ?? null;
    const valueEn = normalizeValue(dto.valueEn) ?? null;
    this.assertPlaceholders(dto.key, valueVi, valueEn);
    await this.assertKeyAvailable(dto.namespace, dto.key);
    try {
      const saved = await this.translations.save(
        this.translations.create({
          namespace: dto.namespace,
          key: dto.key,
          valueVi,
          valueEn,
          description: normalizeValue(dto.description) ?? null,
          isSystem: false,
        }),
      );
      return toUiTranslationResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) throw this.duplicateKey(dto.namespace, dto.key);
      throw error;
    }
  }

  async update(id: string, dto: UpdateUiTranslationDto): Promise<UiTranslationResponseDto> {
    const entity = await this.getOrFail(id);
    assertVersionMatches(entity.version, dto.version);
    const valueVi = normalizeValue(dto.valueVi);
    const valueEn = normalizeValue(dto.valueEn);
    if (valueVi !== undefined) entity.valueVi = valueVi;
    if (valueEn !== undefined) entity.valueEn = valueEn;
    if (dto.description !== undefined) entity.description = normalizeValue(dto.description) ?? null;
    this.assertPlaceholders(entity.key, entity.valueVi, entity.valueEn);
    return toUiTranslationResponse(await this.translations.save(entity));
  }

  async remove(id: string): Promise<void> {
    const entity = await this.getOrFail(id);
    if (entity.isSystem) {
      throw conflict('SYSTEM_RESOURCE_PROTECTED', 'System translations cannot be deleted');
    }
    await this.translations.softRemove(entity);
  }

  // Loads one namespace of nested i18next JSON for a locale; used by the admin import and by seeding
  async importResourceBundle(
    locale: Locale,
    json: unknown,
    options: ImportResourceBundleOptions = {},
  ): Promise<ImportResourceBundleResultDto> {
    const namespace = options.namespace ?? DEFAULT_UI_NAMESPACE;
    if (!UI_TRANSLATION_NAMESPACE_PATTERN.test(namespace) || namespace.length > 60) {
      throw validationFailed([{ field: 'namespace', messages: ['namespace is invalid'] }]);
    }
    let flat: Record<string, string>;
    try {
      flat = flattenResourceBundle(json);
    } catch (error) {
      throw validationFailed([{ field: 'bundle', messages: [(error as Error).message] }]);
    }
    const keys = Object.keys(flat);
    if (keys.length > MAX_IMPORT_KEYS) {
      throw validationFailed([{ field: 'bundle', messages: [`At most ${MAX_IMPORT_KEYS} keys`] }]);
    }
    const invalidKeys = keys.filter(
      (key) => key.length > 200 || !UI_TRANSLATION_KEY_PATTERN.test(key),
    );
    if (invalidKeys.length > 0) {
      throw validationFailed([
        { field: 'bundle', messages: [`Invalid keys: ${invalidKeys.slice(0, 5).join(', ')}`] },
      ]);
    }

    const overwrite = options.overwrite ?? false;
    const result: ImportResourceBundleResultDto = {
      created: 0,
      updated: 0,
      skipped: 0,
      conflicts: [],
      placeholderMismatches: [],
    };

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(UiTranslation);
      const existing = await repository.find({ where: { namespace } });
      const byKey = new Map(existing.map((row) => [row.key, row]));
      const existingKeys = existing.map((row) => row.key);
      const toSave: UiTranslation[] = [];

      for (const key of keys) {
        const value = flat[key];
        const current = byKey.get(key);
        if (!current) {
          if (this.clashesWithExisting(key, existingKeys)) {
            result.conflicts.push(key);
            continue;
          }
          const created = repository.create({
            namespace,
            key,
            valueVi: locale === Locale.VI ? (normalizeValue(value) ?? null) : null,
            valueEn: locale === Locale.EN ? (normalizeValue(value) ?? null) : null,
            description: null,
            isSystem: options.markAsSystem ?? false,
          });
          toSave.push(created);
          existingKeys.push(key);
          byKey.set(key, created);
          result.created += 1;
          continue;
        }
        const property = locale === Locale.VI ? 'valueVi' : 'valueEn';
        const currentValue = current[property];
        if (currentValue === value || (!overwrite && !isBlank(currentValue))) {
          result.skipped += 1;
          continue;
        }
        current[property] = normalizeValue(value) ?? null;
        toSave.push(current);
        result.updated += 1;
      }

      for (const row of toSave) {
        if (
          !isBlank(row.valueVi) &&
          !isBlank(row.valueEn) &&
          !placeholdersMatch(row.valueVi, row.valueEn)
        ) {
          result.placeholderMismatches.push(row.key);
        }
      }
      await repository.save(toSave, { chunk: IMPORT_CHUNK_SIZE });
    });
    return result;
  }

  async loadAllForBundle(
    namespace?: string,
  ): Promise<Pick<UiTranslation, 'namespace' | 'key' | 'valueVi' | 'valueEn'>[]> {
    return this.translations.find({
      select: { namespace: true, key: true, valueVi: true, valueEn: true },
      where: namespace ? { namespace } : {},
      order: { namespace: 'ASC', key: 'ASC' },
    });
  }

  private applyFilters(
    builder: SelectQueryBuilder<UiTranslation>,
    namespace: string | undefined,
    search: string | undefined,
  ): void {
    if (namespace) builder.andWhere('t.namespace = :namespace', { namespace });
    if (search) {
      builder.andWhere(
        '(t.key ILIKE :search OR t.valueVi ILIKE :search OR t.valueEn ILIKE :search OR t.description ILIKE :search)',
        { search: containsPattern(search) },
      );
    }
  }

  private applySort(
    builder: SelectQueryBuilder<UiTranslation>,
    query: ListUiTranslationsQueryDto | ListMissingUiTranslationsQueryDto,
  ): void {
    if (!query.sortBy) {
      builder.orderBy('t.namespace', 'ASC').addOrderBy('t.key', 'ASC');
      return;
    }
    const sort = resolveSort(query, SORTABLE_FIELDS, 'namespace');
    builder.orderBy(`t.${sort.field}`, sort.order).addOrderBy('t.key', 'ASC');
  }

  private blankCondition(property: 'valueVi' | 'valueEn'): string {
    return `(t.${property} IS NULL OR btrim(t.${property}) = '')`;
  }

  private assertPlaceholders(key: string, valueVi: string | null, valueEn: string | null): void {
    if (isBlank(valueVi) || isBlank(valueEn)) return;
    if (!placeholdersMatch(valueVi, valueEn)) {
      throw validationFailed([
        {
          field: key,
          messages: ['The {{placeholders}} in the vi and en texts must be the same'],
        },
      ]);
    }
  }

  private clashesWithExisting(key: string, existingKeys: string[]): boolean {
    const asAncestor = `${key}.`;
    return existingKeys.some(
      (other) => key.startsWith(`${other}.`) || other.startsWith(asAncestor),
    );
  }

  private async assertKeyAvailable(namespace: string, key: string): Promise<void> {
    const segments = key.split('.');
    const ancestors = segments.slice(1).map((_, index) => segments.slice(0, index + 1).join('.'));
    const clash = await this.translations
      .createQueryBuilder('t')
      .where('t.namespace = :namespace', { namespace })
      .andWhere(
        ancestors.length > 0
          ? `(t.key = :key OR t.key IN (:...ancestors) OR t.key LIKE :descendants)`
          : `(t.key = :key OR t.key LIKE :descendants)`,
        { key, ancestors, descendants: `${escapeLikePattern(key)}.%` },
      )
      .getOne();
    if (!clash) return;
    if (clash.key === key) throw this.duplicateKey(namespace, key);
    throw conflict(
      'UI_TRANSLATION_KEY_CONFLICT',
      `Key "${key}" clashes with "${clash.key}": a key cannot be both text and a group`,
    );
  }

  private duplicateKey(namespace: string, key: string) {
    return conflict('UI_TRANSLATION_EXISTS', `Translation ${namespace}:${key} already exists`);
  }

  private async getOrFail(id: string): Promise<UiTranslation> {
    const entity = await this.translations.findOne({ where: { id } });
    if (!entity) throw notFound('Translation');
    return entity;
  }
}
