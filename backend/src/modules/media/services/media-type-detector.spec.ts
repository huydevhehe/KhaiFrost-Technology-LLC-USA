import sharp from 'sharp';
import { detectMediaType } from './media-type-detector';

async function makeImage(format: 'jpeg' | 'png' | 'webp' | 'avif' | 'gif'): Promise<Buffer> {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: '#336699' } })
    .toFormat(format)
    .toBuffer();
}

describe('detectMediaType', () => {
  it.each([
    ['jpeg', 'image/jpeg', 'jpg'],
    ['png', 'image/png', 'png'],
    ['webp', 'image/webp', 'webp'],
    ['avif', 'image/avif', 'avif'],
    ['gif', 'image/gif', 'gif'],
  ] as const)('recognises a real %s', async (format, mimeType, extension) => {
    expect(detectMediaType(await makeImage(format))).toEqual({
      kind: 'image',
      mimeType,
      extension,
    });
  });

  it('recognises a PDF', () => {
    expect(detectMediaType(Buffer.from('%PDF-1.7\n1 0 obj'))).toEqual({
      kind: 'pdf',
      mimeType: 'application/pdf',
      extension: 'pdf',
    });
  });

  it.each([
    ['html', '<!doctype html><html><script>alert(1)</script></html>'],
    ['svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    ['svg with xml prolog', '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'],
    ['windows executable', 'MZ\x90\x00\x03\x00\x00\x00'],
    ['shell script', '#!/bin/sh\nrm -rf /'],
    ['empty', ''],
    ['pdf marker not at the start', 'GARBAGE%PDF-1.4'],
  ])('rejects %s', (_label, content) => {
    expect(detectMediaType(Buffer.from(content, 'latin1'))).toBeNull();
  });

  it('rejects a RIFF container that is not WebP', () => {
    const wave = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt ')]);
    expect(detectMediaType(wave)).toBeNull();
  });

  it('rejects an ISO media file that is not AVIF', () => {
    const mp4 = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from('ftypisom'),
      Buffer.alloc(4),
      Buffer.from('mp41'),
      Buffer.alloc(4),
    ]);
    expect(detectMediaType(mp4)).toBeNull();
  });
});
