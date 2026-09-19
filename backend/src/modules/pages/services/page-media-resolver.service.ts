import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { In, Repository } from 'typeorm';
import { storageConfig } from '../../../config/storage.config';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { MediaFile } from '../utils/section-content.resolver';

const THUMBNAIL_VARIANT_KEYS = ['thumbnail', 'thumb', 'small'];

@Injectable()
export class PageMediaResolverService {
  constructor(
    @InjectRepository(MediaAsset) private readonly assets: Repository<MediaAsset>,
    @Inject(storageConfig.KEY) private readonly storage: ConfigType<typeof storageConfig>,
  ) {}

  async resolve(ids: string[]): Promise<Map<string, MediaFile>> {
    const validIds = [...new Set(ids)].filter((id) => isUUID(id));
    const files = new Map<string, MediaFile>();
    if (validIds.length === 0) return files;
    const assets = await this.assets.find({ where: { id: In(validIds) } });
    for (const asset of assets) {
      const thumbnailKey = THUMBNAIL_VARIANT_KEYS.map(
        (key) => asset.variants?.[key]?.storageKey,
      ).find(Boolean);
      files.set(asset.id, {
        url: this.buildUrl(asset.storageKey),
        thumbnailUrl: thumbnailKey ? this.buildUrl(thumbnailKey) : null,
        width: asset.width,
        height: asset.height,
      });
    }
    return files;
  }

  private buildUrl(storageKey: string): string {
    const encoded = storageKey.split('/').map(encodeURIComponent).join('/');
    return `${this.storage.publicBaseUrl}/${encoded}`;
  }
}
