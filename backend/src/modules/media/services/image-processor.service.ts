import { Injectable } from '@nestjs/common';
import sharp, { Metadata } from 'sharp';
import {
  IMAGE_VARIANT_WIDTHS,
  ImageVariantName,
  MAIN_IMAGE_MAX_DIMENSION,
  MAIN_IMAGE_WEBP_QUALITY,
  MAX_INPUT_PIXELS,
  VARIANT_WEBP_QUALITY,
} from '../constants/media.constants';

export interface ProcessedImageFile {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
  extension: string;
}

export interface ProcessedImage {
  main: ProcessedImageFile;
  variants: Partial<Record<ImageVariantName, ProcessedImageFile>>;
}

export class UnreadableImageError extends Error {}

@Injectable()
export class ImageProcessorService {
  async process(input: Buffer, extension: string, mimeType: string): Promise<ProcessedImage> {
    let metadata: Metadata;
    try {
      metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    } catch {
      throw new UnreadableImageError('The image could not be decoded');
    }
    const isAnimated = (metadata.pages ?? 1) > 1;
    const width = metadata.width;
    const height = isAnimated ? (metadata.pageHeight ?? metadata.height) : metadata.height;
    if (!width || !height) throw new UnreadableImageError('The image has no dimensions');

    // Re-encoding would flatten an animation to a single frame, so it is stored untouched
    if (isAnimated) {
      return { main: { buffer: input, width, height, mimeType, extension }, variants: {} };
    }

    try {
      // sharp drops EXIF/GPS/ICC metadata unless asked to keep it; rotate() applies the EXIF orientation first
      const mainBuffer = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({
          width: MAIN_IMAGE_MAX_DIMENSION,
          height: MAIN_IMAGE_MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: MAIN_IMAGE_WEBP_QUALITY })
        .toBuffer();
      const main = await this.describe(mainBuffer);

      const variants: ProcessedImage['variants'] = {};
      for (const [name, targetWidth] of Object.entries(IMAGE_VARIANT_WIDTHS) as [
        ImageVariantName,
        number,
      ][]) {
        // A variant as wide as the main file would only duplicate it; consumers fall back to the main file
        if (main.width <= targetWidth) continue;
        const variantBuffer = await sharp(mainBuffer)
          .resize({ width: targetWidth, withoutEnlargement: true })
          .webp({ quality: VARIANT_WEBP_QUALITY })
          .toBuffer();
        variants[name] = await this.describe(variantBuffer);
      }
      return { main, variants };
    } catch {
      throw new UnreadableImageError('The image could not be processed');
    }
  }

  private async describe(buffer: Buffer): Promise<ProcessedImageFile> {
    const { width, height } = await sharp(buffer).metadata();
    return {
      buffer,
      width: width ?? 0,
      height: height ?? 0,
      mimeType: 'image/webp',
      extension: 'webp',
    };
  }
}
