import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { paginate, resolveSort } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Locale, SUPPORTED_LOCALES } from '../../../common/enums/locale.enum';
import {
  notFound,
  translationMissing,
  validationFailed,
} from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { MediaReferenceService } from '../../media/services/media-reference.service';
import {
  CLIENT_LOCATION_SORT_FIELDS,
  ClientLocationAdminResponseDto,
  ClientLocationPublicResponseDto,
  ClientLocationTranslationsDto,
  CreateClientLocationDto,
  ListClientLocationsQueryDto,
  PublicClientLocationsQueryDto,
  UpdateClientLocationDto,
} from '../dto/client-location.dto';
import { ClientLocationTranslation } from '../entities/client-location-translation.entity';
import { ClientLocation, ClientLocationStatus } from '../entities/client-location.entity';

const REQUIRED_TRANSLATION_FIELDS = ['quote', 'role', 'country'] as const;

@Injectable()
export class ClientLocationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly media: MediaReferenceService,
  ) {}

  async list(
    query: ListClientLocationsQueryDto,
  ): Promise<PaginatedResponseDto<ClientLocationAdminResponseDto>> {
    const builder = this.dataSource.getRepository(ClientLocation).createQueryBuilder('location');
    if (query.status) builder.andWhere('location.status = :status', { status: query.status });
    if (query.search) {
      builder.andWhere('location.name ILIKE :pattern', { pattern: containsPattern(query.search) });
    }
    const sort = resolveSort(query, CLIENT_LOCATION_SORT_FIELDS, 'sortOrder');
    builder.orderBy(`location.${sort.field}`, sort.order).addOrderBy('location.createdAt', 'ASC');
    const page = await paginate(builder, query);
    const translations = await this.loadTranslations(page.items.map((item) => item.id));
    const urls = await this.media.resolveUrls(page.items.flatMap((item) => this.mediaIds(item)));
    return new PaginatedResponseDto(
      page.items.map((item) =>
        this.toAdmin(
          item,
          translations.filter((row) => row.clientLocationId === item.id),
          urls,
        ),
      ),
      page.meta,
    );
  }

  async getById(id: string): Promise<ClientLocationAdminResponseDto> {
    const location = await this.dataSource.getRepository(ClientLocation).findOne({ where: { id } });
    if (!location) throw notFound('Client location');
    const translations = await this.loadTranslations([id]);
    const urls = await this.media.resolveUrls(this.mediaIds(location));
    return this.toAdmin(location, translations, urls);
  }

  async create(dto: CreateClientLocationDto): Promise<ClientLocationAdminResponseDto> {
    this.assertCoordinatePair(dto.latitude, dto.longitude);
    await this.media.assertAllExist(this.dtoMediaIds(dto));
    const status = dto.status ?? ClientLocationStatus.HIDDEN;
    const id = await this.dataSource.transaction(async (manager) => {
      const rows: { next: string }[] = await manager.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM client_locations WHERE deleted_at IS NULL',
      );
      const location = await manager.save(
        manager.create(ClientLocation, {
          name: dto.name,
          x: dto.x,
          y: dto.y,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          status,
          sortOrder: Number(rows[0]?.next ?? 0),
          avatarId: dto.avatarId ?? null,
          coverImageId: dto.coverImageId ?? null,
        }),
      );
      await this.upsertTranslations(manager, location.id, dto.translations);
      if (status === ClientLocationStatus.PUBLISHED)
        await this.assertPublishable(manager, location.id);
      return location.id;
    });
    return this.getById(id);
  }

  async update(id: string, dto: UpdateClientLocationDto): Promise<ClientLocationAdminResponseDto> {
    await this.media.assertAllExist(this.dtoMediaIds(dto));
    await this.dataSource.transaction(async (manager) => {
      const location = await manager.findOne(ClientLocation, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!location) throw notFound('Client location');
      assertVersionMatches(location.version, dto.version);
      if (dto.name !== undefined) location.name = dto.name;
      if (dto.x !== undefined) location.x = dto.x;
      if (dto.y !== undefined) location.y = dto.y;
      if (dto.latitude !== undefined) location.latitude = dto.latitude ?? null;
      if (dto.longitude !== undefined) location.longitude = dto.longitude ?? null;
      this.assertCoordinatePair(location.latitude, location.longitude);
      if (dto.status !== undefined) location.status = dto.status;
      if (dto.avatarId !== undefined) location.avatarId = dto.avatarId ?? null;
      if (dto.coverImageId !== undefined) location.coverImageId = dto.coverImageId ?? null;
      location.updatedAt = new Date();
      await manager.save(location);
      await this.upsertTranslations(manager, id, dto.translations);
      if (location.status === ClientLocationStatus.PUBLISHED)
        await this.assertPublishable(manager, id);
    });
    return this.getById(id);
  }

  async reorder(ids: string[]): Promise<string[]> {
    return this.dataSource.transaction(async (manager) => {
      const all = await manager.find(ClientLocation, {
        select: { id: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
      const known = new Set(all.map((item) => item.id));
      const unknown = ids.filter((id) => !known.has(id));
      if (unknown.length > 0) {
        throw validationFailed([
          { field: 'ids', messages: [`Unknown ids: ${unknown.join(', ')}`] },
        ]);
      }
      const requested = new Set(ids);
      const ordered = [...ids, ...all.map((item) => item.id).filter((id) => !requested.has(id))];
      for (const [index, id] of ordered.entries()) {
        await manager.update(ClientLocation, { id }, { sortOrder: index });
      }
      return ordered;
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.dataSource
      .getRepository(ClientLocation)
      .softDelete({ id, deletedAt: IsNull() });
    if (!result.affected) throw notFound('Client location');
  }

  async listPublic(
    query: PublicClientLocationsQueryDto,
  ): Promise<PaginatedResponseDto<ClientLocationPublicResponseDto>> {
    const builder = this.dataSource
      .getRepository(ClientLocation)
      .createQueryBuilder('location')
      .where('location.status = :status', { status: ClientLocationStatus.PUBLISHED })
      .orderBy('location.sortOrder', 'ASC')
      .addOrderBy('location.createdAt', 'ASC');
    const page = await paginate(builder, query);
    const translations = await this.loadTranslations(
      page.items.map((item) => item.id),
      query.locale,
    );
    const urls = await this.media.resolveUrls(page.items.flatMap((item) => this.mediaIds(item)));
    return new PaginatedResponseDto(
      page.items.map((item) => {
        const translation = translations.find((row) => row.clientLocationId === item.id);
        return {
          id: item.id,
          name: item.name,
          role: translation?.role ?? '',
          country: translation?.country ?? '',
          quote: translation?.quote ?? '',
          x: item.x,
          y: item.y,
          latitude: item.latitude,
          longitude: item.longitude,
          avatarUrl: item.avatarId ? (urls.get(item.avatarId) ?? null) : null,
          coverImageUrl: item.coverImageId ? (urls.get(item.coverImageId) ?? null) : null,
        };
      }),
      page.meta,
    );
  }

  private toAdmin(
    location: ClientLocation,
    translations: ClientLocationTranslation[],
    urls: Map<string, string>,
  ): ClientLocationAdminResponseDto {
    const byLocale: ClientLocationAdminResponseDto['translations'] = {};
    for (const row of translations) {
      byLocale[row.locale] = { quote: row.quote, role: row.role, country: row.country };
    }
    return {
      id: location.id,
      name: location.name,
      x: location.x,
      y: location.y,
      latitude: location.latitude,
      longitude: location.longitude,
      status: location.status,
      sortOrder: location.sortOrder,
      avatarId: location.avatarId,
      avatarUrl: location.avatarId ? (urls.get(location.avatarId) ?? null) : null,
      coverImageId: location.coverImageId,
      coverImageUrl: location.coverImageId ? (urls.get(location.coverImageId) ?? null) : null,
      version: location.version,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      translations: byLocale,
    };
  }

  private mediaIds(location: ClientLocation): string[] {
    return [location.avatarId, location.coverImageId].filter((id): id is string => !!id);
  }

  private dtoMediaIds(dto: { avatarId?: string | null; coverImageId?: string | null }): string[] {
    return [dto.avatarId, dto.coverImageId].filter((id): id is string => !!id);
  }

  private assertCoordinatePair(
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ): void {
    if (
      (latitude === null || latitude === undefined) !==
      (longitude === null || longitude === undefined)
    ) {
      throw validationFailed([
        { field: 'latitude', messages: ['latitude and longitude must be provided together'] },
      ]);
    }
  }

  private async loadTranslations(
    ids: string[],
    locale?: Locale,
  ): Promise<ClientLocationTranslation[]> {
    if (ids.length === 0) return [];
    return this.dataSource.getRepository(ClientLocationTranslation).find({
      where: locale ? { clientLocationId: In(ids), locale } : { clientLocationId: In(ids) },
    });
  }

  private async upsertTranslations(
    manager: EntityManager,
    clientLocationId: string,
    input?: ClientLocationTranslationsDto,
  ): Promise<void> {
    if (!input) return;
    for (const locale of SUPPORTED_LOCALES) {
      const values = input[locale];
      if (!values) continue;
      const row =
        (await manager.findOne(ClientLocationTranslation, {
          where: { clientLocationId, locale },
        })) ?? manager.create(ClientLocationTranslation, { clientLocationId, locale });
      for (const field of REQUIRED_TRANSLATION_FIELDS) {
        if (values[field] !== undefined) row[field] = values[field] ?? '';
      }
      await manager.save(row);
    }
  }

  private async assertPublishable(manager: EntityManager, id: string): Promise<void> {
    const rows = await manager.find(ClientLocationTranslation, {
      where: { clientLocationId: id },
    });
    const missing: { locale: string; field: string }[] = [];
    for (const locale of SUPPORTED_LOCALES) {
      const row = rows.find((candidate) => candidate.locale === locale);
      for (const field of REQUIRED_TRANSLATION_FIELDS) {
        if (!row?.[field]?.trim()) missing.push({ locale, field });
      }
    }
    if (missing.length > 0) throw translationMissing(missing);
  }
}
