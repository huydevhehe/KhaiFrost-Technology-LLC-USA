import { randomUUID } from 'node:crypto';
import { createReadStream, realpathSync } from 'node:fs';
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, basename, join, relative, resolve, isAbsolute, sep } from 'node:path';
import { Readable } from 'node:stream';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { storageConfig } from '../../../config/storage.config';
import { StorageProvider } from './storage-provider.interface';
import { isValidStorageKey } from './storage-key';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(@Inject(storageConfig.KEY) config: ConfigType<typeof storageConfig>) {
    this.root = resolve(config.uploadDir);
    this.publicBaseUrl = config.publicBaseUrl;
  }

  async put(key: string, body: Buffer, _mimeType: string): Promise<void> {
    const target = this.resolveInsideRoot(key);
    const directory = dirname(target);
    await mkdir(directory, { recursive: true });
    this.assertRealPathInsideRoot(directory);

    // Write to a hidden temp file first so readers never see a partial file
    const temporary = join(directory, `.${basename(target)}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, body, { flag: 'wx' });
      await rename(temporary, target);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolveInsideRoot(key));
  }

  createReadStream(key: string): Readable {
    return createReadStream(this.resolveInsideRoot(key));
  }

  async delete(key: string): Promise<void> {
    const target = this.resolveInsideRoot(key);
    try {
      this.assertRealPathInsideRoot(dirname(target));
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await stat(this.resolveInsideRoot(key))).isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  toPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  // Single choke point for every filesystem access: a key can never point outside the upload root
  resolveInsideRoot(key: string): string {
    if (!isValidStorageKey(key)) throw new Error('Invalid storage key');
    const target = resolve(this.root, key);
    const fromRoot = relative(this.root, target);
    if (fromRoot === '' || fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
      throw new Error('Storage key escapes the upload root');
    }
    return target;
  }

  // Refuses to follow a symbolic link that leads out of the upload root
  private assertRealPathInsideRoot(directory: string): void {
    let realDirectory: string;
    let realRoot: string;
    try {
      realDirectory = realpathSync(directory);
      realRoot = realpathSync(this.root);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    if (realDirectory !== realRoot && !realDirectory.startsWith(realRoot + sep)) {
      throw new Error('Storage path resolves outside the upload root');
    }
  }
}
