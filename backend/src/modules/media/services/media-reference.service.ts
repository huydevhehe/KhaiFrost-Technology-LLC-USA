import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { In, Repository } from 'typeorm';
import { validationFailed } from '../../../common/exceptions/exception.factories';
import { storageConfig } from '../../../config/storage.config';
import { MediaAsset } from '../entities/media-asset.entity';
import { StorageProvider, STORAGE_PROVIDER } from '../storage/storage-provider.interface';

export interface ResolvedMediaAsset {
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  mimeType: string;
}

@Injectable()
export class MediaReferenceService {
  constructor(
    @InjectRepository(MediaAsset) private readonly mediaAssets: Repository<MediaAsset>,
    @Inject(storageConfig.KEY) private readonly storage: ConfigType<typeof storageConfig>,
    // Optional so feature modules can provide this service alone in their own tests
    @Optional() @Inject(STORAGE_PROVIDER) private readonly storageProvider?: StorageProvider,
  ) {}

  async assertAllExist(ids: string[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;

    const validIds = unique.filter((id) => isUUID(id));
    const found = validIds.length
      ? await this.mediaAssets.find({ select: { id: true }, where: { id: In(validIds) } })
      : [];
    const foundIds = new Set(found.map((asset) => asset.id));
    const missing = unique.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw validationFailed([
        { field: 'mediaIds', messages: [`Unknown media assets: ${missing.join(', ')}`] },
      ]);
    }
  }

  async resolveUrls(ids: string[]): Promise<Map<string, string>> {
    const validIds = [...new Set(ids)].filter((id) => isUUID(id));
    const urls = new Map<string, string>();
    if (validIds.length === 0) return urls;

    const assets = await this.mediaAssets.find({
      select: { id: true, storageKey: true },
      where: { id: In(validIds) },
    });
    for (const asset of assets) urls.set(asset.id, this.toUrl(asset.storageKey));
    return urls;
  }

  async resolveAssets(ids: string[]): Promise<Map<string, ResolvedMediaAsset>> {
    const validIds = [...new Set(ids)].filter((id) => isUUID(id));
    const resolved = new Map<string, ResolvedMediaAsset>();
    if (validIds.length === 0) return resolved;

    const assets = await this.mediaAssets.find({ where: { id: In(validIds) } });
    for (const asset of assets) {
      const url = this.toUrl(asset.storageKey);
      const thumbnail = asset.variants?.thumb;
      resolved.set(asset.id, {
        url,
        thumbnailUrl: thumbnail ? this.toUrl(thumbnail.storageKey) : url,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
      });
    }
    return resolved;
  }

  private toUrl(storageKey: string): string {
    if (this.storageProvider) return this.storageProvider.toPublicUrl(storageKey);
    const encodedKey = storageKey.split('/').map(encodeURIComponent).join('/');
    return `${this.storage.publicBaseUrl}/${encodedKey}`;
  }
}
