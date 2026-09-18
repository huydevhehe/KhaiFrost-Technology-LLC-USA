import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { In, Repository } from 'typeorm';
import { validationFailed } from '../../../common/exceptions/exception.factories';
import { storageConfig } from '../../../config/storage.config';
import { MediaAsset } from '../entities/media-asset.entity';

@Injectable()
export class MediaReferenceService {
  constructor(
    @InjectRepository(MediaAsset) private readonly mediaAssets: Repository<MediaAsset>,
    @Inject(storageConfig.KEY) private readonly storage: ConfigType<typeof storageConfig>,
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
    for (const asset of assets) {
      const encodedKey = asset.storageKey.split('/').map(encodeURIComponent).join('/');
      urls.set(asset.id, `${this.storage.publicBaseUrl}/${encodedKey}`);
    }
    return urls;
  }
}
