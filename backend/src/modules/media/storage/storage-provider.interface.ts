import { Readable } from 'node:stream';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StorageProvider {
  put(key: string, body: Buffer, mimeType: string): Promise<void>;
  read(key: string): Promise<Buffer>;
  createReadStream(key: string): Readable;
  // Must be idempotent: deleting a missing key is not an error
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  toPublicUrl(key: string): string;
}
