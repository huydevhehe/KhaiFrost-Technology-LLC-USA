import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { MEDIA_PURGE_BATCH_SIZE, MEDIA_TRASH_RETENTION_DAYS } from '../constants/media.constants';
import { MediaAsset } from '../entities/media-asset.entity';
import { StorageProvider, STORAGE_PROVIDER } from '../storage/storage-provider.interface';

export interface PurgeSummary {
  purged: number;
  skipped: number;
  failed: number;
}

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const PG_FOREIGN_KEY_VIOLATION = '23503';

function isForeignKeyViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === PG_FOREIGN_KEY_VIOLATION
  );
}

@Injectable()
export class MediaPurgeService {
  private readonly logger = new Logger(MediaPurgeService.name);

  constructor(
    @InjectRepository(MediaAsset) private readonly assets: Repository<MediaAsset>,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'media-trash-purge' })
  async runScheduled(): Promise<void> {
    try {
      const summary = await this.purgeExpired();
      this.logger.log(
        `Media purge finished: ${summary.purged} purged, ${summary.skipped} skipped, ${summary.failed} failed`,
      );
    } catch (error) {
      this.logger.error('Media purge failed', error instanceof Error ? error.stack : String(error));
    }
  }

  // Only rows soft-deleted longer ago than the retention period are ever considered
  async purgeExpired(now: Date = new Date()): Promise<PurgeSummary> {
    const cutoff = new Date(now.getTime() - MEDIA_TRASH_RETENTION_DAYS * MILLISECONDS_PER_DAY);
    const summary: PurgeSummary = { purged: 0, skipped: 0, failed: 0 };
    for (;;) {
      // Purged rows vanish from the result set; skipped and failed ones stay, so step over them
      const batch = await this.assets
        .createQueryBuilder('asset')
        .withDeleted()
        .where('asset.deletedAt IS NOT NULL')
        .andWhere('asset.deletedAt < :cutoff', { cutoff })
        .orderBy('asset.deletedAt', 'ASC')
        .addOrderBy('asset.id', 'ASC')
        .offset(summary.skipped + summary.failed)
        .limit(MEDIA_PURGE_BATCH_SIZE)
        .getMany();
      if (batch.length === 0) break;
      for (const asset of batch) summary[await this.purgeOne(asset, cutoff)] += 1;
    }
    return summary;
  }

  private async purgeOne(
    asset: MediaAsset,
    cutoff: Date,
  ): Promise<'purged' | 'skipped' | 'failed'> {
    const keys = [
      asset.storageKey,
      ...Object.values(asset.variants ?? {}).map((v) => v.storageKey),
    ];
    try {
      // Row first: if the database refuses (still referenced), no file is lost
      const result = await this.assets
        .createQueryBuilder()
        .delete()
        .from(MediaAsset)
        .where('id = :id', { id: asset.id })
        .andWhere('deleted_at IS NOT NULL')
        .andWhere('deleted_at < :cutoff', { cutoff })
        .execute();
      if (!result.affected) return 'skipped';
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        this.logger.warn(`Media ${asset.id} is still referenced by soft-deleted rows; kept`);
        return 'skipped';
      }
      this.logger.error(`Could not purge media ${asset.id}`, String(error));
      return 'failed';
    }

    for (const key of keys) {
      try {
        await this.storage.delete(key);
      } catch (error) {
        // An orphaned file is harmless; the provider refuses anything outside the upload root
        this.logger.error(
          `Could not delete file "${key}" of purged media ${asset.id}`,
          String(error),
        );
      }
    }
    return 'purged';
  }
}
