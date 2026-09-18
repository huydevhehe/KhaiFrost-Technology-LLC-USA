import { randomBytes } from 'node:crypto';
import sharp from 'sharp';

export interface ImageFixtureOptions {
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  withExif?: boolean;
  orientation?: number;
}

// Noise makes every fixture unique (so checksums differ) and hard to compress
export async function createImage(options: ImageFixtureOptions = {}): Promise<Buffer> {
  const { width = 64, height = 48, format = 'jpeg', withExif = false, orientation } = options;
  const pixels = randomBytes(width * height * 3);
  let pipeline = sharp(pixels, { raw: { width, height, channels: 3 } });
  if (withExif) {
    pipeline = pipeline.withExif({
      IFD0: { Copyright: 'Secret Photographer', Make: 'SecretCamera' },
      IFD3: { GPSLatitudeRef: 'N', GPSLongitudeRef: 'E' },
    });
  }
  if (orientation) pipeline = pipeline.withMetadata({ orientation });
  return pipeline.toFormat(format).toBuffer();
}

export async function createAnimatedGif(): Promise<Buffer> {
  const frame = (color: string) =>
    sharp({ create: { width: 16, height: 16, channels: 3, background: color } })
      .png()
      .toBuffer();
  const frames = await Promise.all([frame('#ff0000'), frame('#00ff00'), frame('#0000ff')]);
  return sharp(frames, { join: { animated: true } })
    .gif()
    .toBuffer();
}

export function createPdf(): Buffer {
  return Buffer.concat([
    Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n'),
    randomBytes(16),
  ]);
}
