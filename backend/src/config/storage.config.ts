import { resolve } from 'node:path';
import { ConfigType, registerAs } from '@nestjs/config';
import { BACKEND_ROOT } from './backend-root';
import { loadEnvironment } from './environment';

export const storageConfig = registerAs('storage', () => {
  const env = loadEnvironment();
  return {
    driver: env.STORAGE_DRIVER,
    uploadDir: resolve(BACKEND_ROOT, env.UPLOAD_DIR),
    publicBaseUrl: env.PUBLIC_MEDIA_BASE_URL.replace(/\/+$/, ''),
    maxFileSizeMb: env.MEDIA_MAX_FILE_SIZE_MB,
    maxFileSizeBytes: env.MEDIA_MAX_FILE_SIZE_MB * 1024 * 1024,
  };
});

export type StorageConfig = ConfigType<typeof storageConfig>;
