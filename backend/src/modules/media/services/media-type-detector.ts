export type DetectedMediaKind = 'image' | 'pdf';

export interface DetectedMediaType {
  kind: DetectedMediaKind;
  mimeType: string;
  extension: string;
}

const JPEG: DetectedMediaType = { kind: 'image', mimeType: 'image/jpeg', extension: 'jpg' };
const PNG: DetectedMediaType = { kind: 'image', mimeType: 'image/png', extension: 'png' };
const GIF: DetectedMediaType = { kind: 'image', mimeType: 'image/gif', extension: 'gif' };
const WEBP: DetectedMediaType = { kind: 'image', mimeType: 'image/webp', extension: 'webp' };
const AVIF: DetectedMediaType = { kind: 'image', mimeType: 'image/avif', extension: 'avif' };
const PDF: DetectedMediaType = { kind: 'pdf', mimeType: 'application/pdf', extension: 'pdf' };

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function asciiAt(buffer: Buffer, offset: number, length: number): string {
  return buffer.subarray(offset, offset + length).toString('latin1');
}

function isAvif(buffer: Buffer): boolean {
  if (buffer.length < 16 || asciiAt(buffer, 4, 4) !== 'ftyp') return false;
  const boxSize = Math.min(buffer.readUInt32BE(0), buffer.length, 64);
  // Major brand at 8, minor version at 12, then compatible brands
  const brands = [asciiAt(buffer, 8, 4)];
  for (let offset = 16; offset + 4 <= boxSize; offset += 4) brands.push(asciiAt(buffer, offset, 4));
  return brands.some((brand) => brand === 'avif' || brand === 'avis');
}

// The client mimetype and file extension are never consulted: only the leading bytes decide
export function detectMediaType(buffer: Buffer): DetectedMediaType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return JPEG;
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return PNG;
  if (buffer.length >= 6) {
    const header = asciiAt(buffer, 0, 6);
    if (header === 'GIF87a' || header === 'GIF89a') return GIF;
  }
  if (buffer.length >= 12 && asciiAt(buffer, 0, 4) === 'RIFF' && asciiAt(buffer, 8, 4) === 'WEBP') {
    return WEBP;
  }
  if (isAvif(buffer)) return AVIF;
  if (buffer.length >= 5 && asciiAt(buffer, 0, 5) === '%PDF-') return PDF;
  return null;
}
