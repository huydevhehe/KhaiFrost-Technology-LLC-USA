import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { basename, isAbsolute } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { paginate } from '../../../common/dto/paginate';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { Locale } from '../../../common/enums/locale.enum';
import { badRequest, conflict, notFound } from '../../../common/exceptions/exception.factories';
import { assertVersionMatches } from '../../../common/utils/assert-version-matches';
import { containsPattern } from '../../../common/utils/escape-like-pattern';
import { storageConfig } from '../../../config/storage.config';
import { MEDIA_MAX_FILES_PER_UPLOAD, MediaErrorCode } from '../constants/media.constants';
import {
  MediaAssetDetailResponseDto,
  MediaAssetResponseDto,
  MediaUploadResponseDto,
  MediaUploadResultDto,
} from '../dto/media-asset-response.dto';
import { ListMediaQueryDto, MediaSort, MediaTypeFilter } from '../dto/list-media-query.dto';
import { MediaTranslationsInputDto, UpdateMediaDto } from '../dto/update-media.dto';
import { MediaAssetTranslation } from '../entities/media-asset-translation.entity';
import { MediaAsset, MediaVariant } from '../entities/media-asset.entity';
import {
  toMediaAssetDetailResponse,
  toMediaAssetResponse,
  PublicUrlResolver,
} from '../mappers/media-asset.mapper';
import { StorageProvider, STORAGE_PROVIDER } from '../storage/storage-provider.interface';
import { buildStorageKey, createStorageKeyBase } from '../storage/storage-key';
import { ImageProcessorService, UnreadableImageError } from './image-processor.service';
import { detectMediaType } from './media-type-detector';
import { MediaUsageService } from './media-usage.service';

export interface MediaFileInput {
  buffer: Buffer;
  originalName: string;
}

export interface MediaIngestOptions {
  folder?: string | null;
  altText?: Partial<Record<Locale, string>>;
  createdById?: string | null;
}

export interface LocalFileImportOptions extends MediaIngestOptions {
  originalName?: string;
}

interface StoredFile {
  key: string;
  buffer: Buffer;
  mimeType: string;
}

class RejectedFile extends Error {
  constructor(
    readonly code: MediaErrorCode,
    message: string,
  ) {
    super(message);
  }
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly toUrl: PublicUrlResolver = (key) => this.storage.toPublicUrl(key);

  constructor(
    @InjectRepository(MediaAsset) private readonly assets: Repository<MediaAsset>,
    @InjectRepository(MediaAssetTranslation)
    private readonly translations: Repository<MediaAssetTranslation>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(storageConfig.KEY) private readonly config: ConfigType<typeof storageConfig>,
    private readonly imageProcessor: ImageProcessorService,
    private readonly usageService: MediaUsageService,
  ) {}

  async uploadMany(
    files: MediaFileInput[],
    options: MediaIngestOptions,
  ): Promise<MediaUploadResponseDto> {
    if (files.length === 0) {
      throw badRequest(MediaErrorCode.NO_FILES, 'Send at least one file in the "files" field');
    }
    if (files.length > MEDIA_MAX_FILES_PER_UPLOAD) {
      throw badRequest(
        MediaErrorCode.TOO_MANY_FILES,
        `At most ${MEDIA_MAX_FILES_PER_UPLOAD} files per request`,
      );
    }
    // Sequential on purpose: image encoding is CPU and memory heavy
    const results: MediaUploadResultDto[] = [];
    for (const file of files) results.push(await this.ingest(file, options));
    return {
      results,
      created: results.filter((result) => result.status === 'created').length,
      duplicates: results.filter((result) => result.status === 'duplicate').length,
      rejected: results.filter((result) => result.status === 'rejected').length,
    };
  }

  // Same pipeline as an upload, fed from disk; the checksum dedupe makes repeated imports idempotent
  async importFromLocalFile(
    absolutePath: string,
    options: LocalFileImportOptions = {},
  ): Promise<MediaUploadResultDto> {
    const originalName = options.originalName ?? basename(absolutePath);
    if (!isAbsolute(absolutePath)) {
      return this.rejected(
        originalName,
        MediaErrorCode.INVALID_IMAGE,
        'An absolute path is required',
      );
    }
    let buffer: Buffer;
    try {
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) throw new Error('Not a regular file');
      if (fileStat.size > this.config.maxFileSizeBytes) {
        return this.rejected(originalName, MediaErrorCode.TOO_LARGE, this.tooLargeMessage());
      }
      buffer = await readFile(absolutePath);
    } catch {
      return this.rejected(originalName, MediaErrorCode.EMPTY_FILE, 'The file could not be read');
    }
    return this.ingest({ buffer, originalName }, options);
  }

  async list(query: ListMediaQueryDto): Promise<PaginatedResponseDto<MediaAssetResponseDto>> {
    const builder = this.assets.createQueryBuilder('asset');
    if (query.search) {
      builder.andWhere('(asset.originalName ILIKE :pattern OR asset.displayName ILIKE :pattern)', {
        pattern: containsPattern(query.search),
      });
    }
    if (query.folder) builder.andWhere('asset.folder = :folder', { folder: query.folder });
    if (query.type === MediaTypeFilter.PDF) {
      builder.andWhere('asset.mimeType = :pdf', { pdf: 'application/pdf' });
    } else if (query.type === MediaTypeFilter.IMAGE) {
      builder.andWhere('asset.mimeType LIKE :imageFamily', { imageFamily: 'image/%' });
    }

    const total = await builder.getCount();
    switch (query.sort) {
      case MediaSort.OLDEST:
        builder.orderBy('asset.createdAt', 'ASC');
        break;
      case MediaSort.NAME:
        builder.orderBy('LOWER(COALESCE(asset.displayName, asset.originalName))', 'ASC');
        break;
      case MediaSort.SIZE:
        builder.orderBy('asset.sizeBytes', 'DESC');
        break;
      default:
        builder.orderBy('asset.createdAt', 'DESC');
    }
    const items = await builder
      .addOrderBy('asset.id', 'ASC')
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .getMany();
    return paginate([items, total], query, (asset) => toMediaAssetResponse(asset, this.toUrl));
  }

  async getDetail(id: string): Promise<MediaAssetDetailResponseDto> {
    const asset = await this.findOrFail(id);
    return this.buildDetail(asset);
  }

  async update(id: string, dto: UpdateMediaDto): Promise<MediaAssetDetailResponseDto> {
    const asset = await this.findOrFail(id);
    if (dto.version !== undefined) assertVersionMatches(asset.version, dto.version);

    if (dto.displayName !== undefined) asset.displayName = dto.displayName || null;
    if (dto.folder !== undefined) asset.folder = dto.folder || null;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(MediaAsset).save(asset);
      if (dto.translations) await this.upsertTranslations(manager, asset.id, dto.translations);
    });
    return this.getDetail(id);
  }

  async remove(id: string): Promise<void> {
    const asset = await this.findOrFail(id);
    const usages = await this.usageService.listUsages(asset.id);
    if (usages.length > 0) {
      throw conflict(
        MediaErrorCode.IN_USE,
        'This file is still used by other content and cannot be deleted',
        usages,
      );
    }
    await this.assets.softDelete({ id: asset.id });
  }

  private async findOrFail(id: string): Promise<MediaAsset> {
    const asset = await this.assets.findOne({ where: { id } });
    if (!asset) throw notFound('Media asset');
    return asset;
  }

  private async buildDetail(asset: MediaAsset): Promise<MediaAssetDetailResponseDto> {
    const [translations, usages] = await Promise.all([
      this.translations.find({ where: { mediaAssetId: asset.id } }),
      this.usageService.listUsages(asset.id),
    ]);
    return toMediaAssetDetailResponse(asset, translations, usages, this.toUrl);
  }

  private async upsertTranslations(
    manager: EntityManager,
    mediaAssetId: string,
    input: MediaTranslationsInputDto,
  ): Promise<void> {
    const repository = manager.getRepository(MediaAssetTranslation);
    const existing = await repository.find({ where: { mediaAssetId } });
    for (const locale of [Locale.VI, Locale.EN]) {
      const values = input[locale];
      if (!values) continue;
      const row =
        existing.find((translation) => translation.locale === locale) ??
        repository.create({ mediaAssetId, locale, altText: null, caption: null });
      if (values.altText !== undefined) row.altText = values.altText || null;
      if (values.caption !== undefined) row.caption = values.caption || null;
      await repository.save(row);
    }
  }

  private async ingest(
    file: MediaFileInput,
    options: MediaIngestOptions,
  ): Promise<MediaUploadResultDto> {
    const originalName = sanitizeOriginalName(file.originalName);
    const writtenKeys: string[] = [];
    try {
      if (file.buffer.length === 0) {
        throw new RejectedFile(MediaErrorCode.EMPTY_FILE, 'The file is empty');
      }
      if (file.buffer.length > this.config.maxFileSizeBytes) {
        throw new RejectedFile(MediaErrorCode.TOO_LARGE, this.tooLargeMessage());
      }
      const detected = detectMediaType(file.buffer);
      if (!detected) {
        throw new RejectedFile(
          MediaErrorCode.UNSUPPORTED_TYPE,
          'Only JPEG, PNG, WebP, AVIF, GIF images and PDF documents are accepted',
        );
      }

      const checksum = createHash('sha256').update(file.buffer).digest('hex');
      const existing = await this.assets.findOne({ where: { checksumSha256: checksum } });
      if (existing) {
        return {
          originalName,
          status: 'duplicate',
          asset: toMediaAssetResponse(existing, this.toUrl),
        };
      }

      const base = createStorageKeyBase();
      const mainFile: StoredFile & { width: number | null; height: number | null } = {
        key: '',
        buffer: file.buffer,
        mimeType: detected.mimeType,
        width: null,
        height: null,
      };
      const variantFiles: Record<string, StoredFile & { width: number; height: number }> = {};

      if (detected.kind === 'image') {
        let processed;
        try {
          processed = await this.imageProcessor.process(
            file.buffer,
            detected.extension,
            detected.mimeType,
          );
        } catch (error) {
          if (error instanceof UnreadableImageError) {
            throw new RejectedFile(MediaErrorCode.INVALID_IMAGE, error.message);
          }
          throw error;
        }
        mainFile.key = buildStorageKey(base, processed.main.extension);
        mainFile.buffer = processed.main.buffer;
        mainFile.mimeType = processed.main.mimeType;
        mainFile.width = processed.main.width;
        mainFile.height = processed.main.height;
        for (const [name, variant] of Object.entries(processed.variants)) {
          variantFiles[name] = {
            key: buildStorageKey(base, variant.extension, name),
            buffer: variant.buffer,
            mimeType: variant.mimeType,
            width: variant.width,
            height: variant.height,
          };
        }
      } else {
        mainFile.key = buildStorageKey(base, detected.extension);
      }

      for (const stored of [mainFile, ...Object.values(variantFiles)]) {
        await this.storage.put(stored.key, stored.buffer, stored.mimeType);
        writtenKeys.push(stored.key);
      }

      const variants: Record<string, MediaVariant> = {};
      for (const [name, variant] of Object.entries(variantFiles)) {
        variants[name] = {
          storageKey: variant.key,
          width: variant.width,
          height: variant.height,
          sizeBytes: variant.buffer.length,
          mimeType: variant.mimeType,
        };
      }

      const saved = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(MediaAsset);
        const asset = await repository.save(
          repository.create({
            originalName,
            displayName: null,
            storageKey: mainFile.key,
            mimeType: mainFile.mimeType,
            sizeBytes: mainFile.buffer.length,
            width: mainFile.width,
            height: mainFile.height,
            checksumSha256: checksum,
            folder: options.folder || null,
            variants,
            uploadedById: options.createdById ?? null,
            createdById: options.createdById ?? null,
          }),
        );
        const altText = options.altText;
        if (altText && (altText.vi || altText.en)) {
          await this.upsertTranslations(manager, asset.id, {
            vi: altText.vi ? { altText: altText.vi } : undefined,
            en: altText.en ? { altText: altText.en } : undefined,
          });
        }
        return asset;
      });
      return { originalName, status: 'created', asset: toMediaAssetResponse(saved, this.toUrl) };
    } catch (error) {
      // Nothing half-written stays behind when a later step fails
      await Promise.all(writtenKeys.map((key) => this.storage.delete(key).catch(() => undefined)));
      if (error instanceof RejectedFile) {
        return this.rejected(originalName, error.code, error.message);
      }
      this.logger.error(
        `Failed to ingest "${originalName}"`,
        error instanceof Error ? error.stack : String(error),
      );
      return this.rejected(
        originalName,
        MediaErrorCode.PROCESSING_FAILED,
        'The file could not be processed',
      );
    }
  }

  private rejected(
    originalName: string,
    code: MediaErrorCode,
    message: string,
  ): MediaUploadResultDto {
    return { originalName, status: 'rejected', error: { code, message } };
  }

  private tooLargeMessage(): string {
    return `Files larger than ${this.config.maxFileSizeMb} MB are not accepted`;
  }
}

// The client supplied name is metadata only: strip any path and control characters
export function sanitizeOriginalName(name: string): string {
  const lastSegment = name.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const cleaned = lastSegment.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (cleaned || 'file').slice(0, 255);
}
