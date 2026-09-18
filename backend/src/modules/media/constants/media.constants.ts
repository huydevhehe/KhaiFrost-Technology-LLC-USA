export const MEDIA_TRASH_RETENTION_DAYS = 30;
export const MEDIA_PURGE_BATCH_SIZE = 100;
export const MEDIA_MAX_FILES_PER_UPLOAD = 20;
export const MEDIA_UPLOAD_FIELD_NAME = 'files';

export const MAIN_IMAGE_MAX_DIMENSION = 2560;
export const MAIN_IMAGE_WEBP_QUALITY = 82;
export const VARIANT_WEBP_QUALITY = 80;
// Decompression bomb guard: refuse to decode images larger than this many pixels
export const MAX_INPUT_PIXELS = 80_000_000;

export const IMAGE_VARIANT_WIDTHS = { thumb: 320, medium: 768, large: 1280 } as const;
export type ImageVariantName = keyof typeof IMAGE_VARIANT_WIDTHS;

export const MAX_USAGES_PER_RELATION = 50;

export enum MediaErrorCode {
  IN_USE = 'MEDIA_IN_USE',
  UNSUPPORTED_TYPE = 'MEDIA_UNSUPPORTED_TYPE',
  EMPTY_FILE = 'MEDIA_EMPTY_FILE',
  INVALID_IMAGE = 'MEDIA_INVALID_IMAGE',
  TOO_LARGE = 'MEDIA_TOO_LARGE',
  NO_FILES = 'MEDIA_NO_FILES',
  TOO_MANY_FILES = 'MEDIA_TOO_MANY_FILES',
  PROCESSING_FAILED = 'MEDIA_PROCESSING_FAILED',
}
