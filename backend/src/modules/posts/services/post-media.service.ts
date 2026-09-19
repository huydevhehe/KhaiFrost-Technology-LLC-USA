import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { storageConfig } from '../../../config/storage.config';
import { MediaAsset } from '../../media/entities/media-asset.entity';
import { MediaReferenceService } from '../../media/services/media-reference.service';

const THUMBNAIL_VARIANT = 'thumb';

export interface ResolvedMedia {
  id: string;
  url: string;
  thumbnailUrl: string;
}

@Injectable()
export class PostMediaService {
  constructor(
    private readonly mediaReference: MediaReferenceService,
    @InjectRepository(MediaAsset) private readonly mediaAssets: Repository<MediaAsset>,
    @Inject(storageConfig.KEY) private readonly storage: ConfigType<typeof storageConfig>,
  ) {}

  assertAllExist(ids: string[]): Promise<void> {
    return this.mediaReference.assertAllExist(ids);
  }

  // One batched lookup; the thumbnail falls back to the original when no variant exists
  async resolve(
    ids: ReadonlyArray<string | null | undefined>,
  ): Promise<Map<string, ResolvedMedia>> {
    const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    const resolved = new Map<string, ResolvedMedia>();
    if (unique.length === 0) return resolved;

    const [urls, assets] = await Promise.all([
      this.mediaReference.resolveUrls(unique),
      this.mediaAssets.find({ select: { id: true, variants: true }, where: { id: In(unique) } }),
    ]);
    for (const asset of assets) {
      const url = urls.get(asset.id);
      if (!url) continue;
      const thumbnailKey = asset.variants?.[THUMBNAIL_VARIANT]?.storageKey;
      resolved.set(asset.id, {
        id: asset.id,
        url,
        thumbnailUrl: thumbnailKey ? this.buildUrl(thumbnailKey) : url,
      });
    }
    return resolved;
  }

  private buildUrl(storageKey: string): string {
    const encodedKey = storageKey.split('/').map(encodeURIComponent).join('/');
    return `${this.storage.publicBaseUrl}/${encodedKey}`;
  }
}
