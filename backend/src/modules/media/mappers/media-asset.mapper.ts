import { Locale } from '../../../common/enums/locale.enum';
import {
  LocalizedTextDto,
  MediaAssetDetailResponseDto,
  MediaAssetResponseDto,
  MediaVariantResponseDto,
} from '../dto/media-asset-response.dto';
import { MediaAssetTranslation } from '../entities/media-asset-translation.entity';
import { MediaAsset } from '../entities/media-asset.entity';
import { MediaUsage } from '../services/media-usage.service';

export type PublicUrlResolver = (storageKey: string) => string;

export function toMediaAssetResponse(
  asset: MediaAsset,
  toUrl: PublicUrlResolver,
): MediaAssetResponseDto {
  const url = toUrl(asset.storageKey);
  const thumbnail = asset.variants?.thumb;
  return {
    id: asset.id,
    name: asset.displayName ?? asset.originalName,
    originalName: asset.originalName,
    displayName: asset.displayName,
    kind: asset.mimeType === 'application/pdf' ? 'pdf' : 'image',
    mimeType: asset.mimeType,
    url,
    thumbnailUrl: thumbnail ? toUrl(thumbnail.storageKey) : url,
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.sizeBytes,
    folder: asset.folder,
    uploadedById: asset.uploadedById,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

function localized(
  translations: MediaAssetTranslation[],
  field: 'altText' | 'caption',
): LocalizedTextDto {
  const pick = (locale: Locale) =>
    translations.find((translation) => translation.locale === locale)?.[field] ?? null;
  return { vi: pick(Locale.VI), en: pick(Locale.EN) };
}

export function toMediaAssetDetailResponse(
  asset: MediaAsset,
  translations: MediaAssetTranslation[],
  usages: MediaUsage[],
  toUrl: PublicUrlResolver,
): MediaAssetDetailResponseDto {
  const variants: Record<string, MediaVariantResponseDto> = {};
  for (const [name, variant] of Object.entries(asset.variants ?? {})) {
    variants[name] = {
      url: toUrl(variant.storageKey),
      width: variant.width,
      height: variant.height,
      sizeBytes: variant.sizeBytes,
      mimeType: variant.mimeType,
    };
  }
  return {
    ...toMediaAssetResponse(asset, toUrl),
    version: asset.version,
    checksumSha256: asset.checksumSha256,
    variants,
    altText: localized(translations, 'altText'),
    caption: localized(translations, 'caption'),
    usages,
  };
}
