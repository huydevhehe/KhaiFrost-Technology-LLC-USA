import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource, Repository } from 'typeorm';
import { ErrorCode } from '../../../common/constants/error-codes';
import { DEFAULT_LOCALE, Locale } from '../../../common/enums/locale.enum';
import { conflict, validationFailed } from '../../../common/exceptions/exception.factories';
import { validationExceptionFactory } from '../../../common/filters/validation-exception.factory';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { isUniqueViolation } from '../../../common/utils/database-errors';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import { PUBLIC_GROUP_KEYS, SettingGroup } from '../constants/setting-group';
import {
  SETTING_GROUP_DEFINITIONS,
  SettingGroupDefinition,
} from '../constants/setting-group-definitions';
import { SettingResponseDto, UpdateSettingDto } from '../dto/setting.dto';
import { SiteSettingMedia } from '../entities/site-setting-media.entity';
import { SiteSetting } from '../entities/site-setting.entity';
import {
  collectMediaReferences,
  localizeValue,
  resolveMediaFields,
} from '../utils/setting-media-paths';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SiteSetting) private readonly settings: Repository<SiteSetting>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mediaReferences: MediaReferenceService,
  ) {}

  async listAdmin(): Promise<SettingResponseDto[]> {
    const rows = await this.settings.find();
    const byGroup = new Map(rows.map((row) => [row.group, row]));
    return Promise.all(
      Object.values(SETTING_GROUP_DEFINITIONS).map((definition) =>
        this.toResponse(definition, byGroup.get(definition.group) ?? null),
      ),
    );
  }

  async getAdmin(group: SettingGroup): Promise<SettingResponseDto> {
    const definition = SETTING_GROUP_DEFINITIONS[group];
    return this.toResponse(definition, await this.settings.findOne({ where: { group } }));
  }

  async update(group: SettingGroup, dto: UpdateSettingDto): Promise<SettingResponseDto> {
    const definition = SETTING_GROUP_DEFINITIONS[group];
    const value = await this.validateValue(definition, dto.value);
    const references = collectMediaReferences(value, definition.mediaFields);
    await this.mediaReferences.assertAllExist(references.map((item) => item.mediaAssetId));

    let saved: SiteSetting;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(SiteSetting);
        let row = await repository.findOne({
          where: { group },
          lock: { mode: 'pessimistic_write' },
        });
        if (row) {
          assertVersionMatches(row.version, dto.version);
        } else {
          assertVersionMatches(0, dto.version);
          row = repository.create({ group, isPublic: definition.defaultIsPublic });
        }
        row.value = value;
        if (dto.isPublic !== undefined) row.isPublic = dto.isPublic;
        row = await repository.save(row);

        const mediaRepository = manager.getRepository(SiteSettingMedia);
        await mediaRepository.delete({ settingId: row.id });
        if (references.length > 0) {
          await mediaRepository.insert(
            references.map((item) => ({
              settingId: row!.id,
              mediaAssetId: item.mediaAssetId,
              fieldKey: item.fieldKey,
            })),
          );
        }
        return row;
      });
    } catch (error) {
      // Two first saves racing: the loser must reload and retry
      if (isUniqueViolation(error)) {
        throw conflict(ErrorCode.VERSION_CONFLICT, 'This setting was saved by someone else', {
          expectedVersion: dto.version,
        });
      }
      throw error;
    }
    return this.toResponse(definition, saved);
  }

  // For other modules: the stored value of a group, or its built-in default
  async getValue<T = Record<string, unknown>>(group: SettingGroup): Promise<T> {
    const row = await this.settings.findOne({ where: { group } });
    return (row?.value ?? SETTING_GROUP_DEFINITIONS[group].defaultValue()) as T;
  }

  async getPublic(locale: Locale): Promise<Record<string, unknown>> {
    const rows = await this.settings.find();
    const byGroup = new Map(rows.map((row) => [row.group, row]));
    const groups: { definition: SettingGroupDefinition; value: Record<string, unknown> }[] = [];
    for (const definition of Object.values(SETTING_GROUP_DEFINITIONS)) {
      const row = byGroup.get(definition.group);
      const isPublic = row ? row.isPublic : definition.defaultIsPublic;
      if (!isPublic) continue;
      groups.push({ definition, value: row?.value ?? definition.defaultValue() });
    }

    const mediaIds = groups.flatMap(({ definition, value }) =>
      collectMediaReferences(value, definition.mediaFields).map((item) => item.mediaAssetId),
    );
    const urls = await this.mediaReferences.resolveUrls(mediaIds);

    const output: Record<string, unknown> = {};
    for (const { definition, value } of groups) {
      const withMedia = resolveMediaFields(
        value,
        definition.mediaFields,
        (id) => urls.get(id) ?? null,
      );
      output[PUBLIC_GROUP_KEYS[definition.group]] = localizeValue(
        withMedia,
        locale,
        DEFAULT_LOCALE,
      );
    }
    return output;
  }

  private async validateValue(
    definition: SettingGroupDefinition,
    raw: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const instance = plainToInstance(definition.dto, raw);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) throw validationExceptionFactory(errors);
    const value = instanceToPlain(instance) as Record<string, unknown>;
    const ruleErrors = definition.refine?.(value) ?? [];
    if (ruleErrors.length > 0) throw validationFailed(ruleErrors);
    return value;
  }

  private async toResponse(
    definition: SettingGroupDefinition,
    row: SiteSetting | null,
  ): Promise<SettingResponseDto> {
    const value = row?.value ?? definition.defaultValue();
    const ids = collectMediaReferences(value, definition.mediaFields).map(
      (item) => item.mediaAssetId,
    );
    const urls = await this.mediaReferences.resolveUrls(ids);
    return {
      group: definition.group,
      value,
      isPublic: row ? row.isPublic : definition.defaultIsPublic,
      isDefault: row === null,
      version: row?.version ?? 0,
      updatedAt: row?.updatedAt ?? null,
      mediaUrls: Object.fromEntries(urls),
    };
  }
}
