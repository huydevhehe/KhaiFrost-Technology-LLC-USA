import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { memoryStorage } from 'multer';
import { storageConfig } from '../../config/storage.config';
import { MEDIA_MAX_FILES_PER_UPLOAD } from './constants/media.constants';
import { MediaAdminController } from './controllers/media-admin.controller';
import { MediaAssetTranslation } from './entities/media-asset-translation.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { ImageProcessorService } from './services/image-processor.service';
import { MediaPurgeService } from './services/media-purge.service';
import { MediaReferenceService } from './services/media-reference.service';
import { MediaUsageService } from './services/media-usage.service';
import { MediaService } from './services/media.service';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { STORAGE_PROVIDER } from './storage/storage-provider.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaAsset, MediaAssetTranslation]),
    MulterModule.registerAsync({
      inject: [storageConfig.KEY],
      useFactory: (config: ConfigType<typeof storageConfig>) => ({
        storage: memoryStorage(),
        // Multipart field names and file names arrive as UTF-8 from browsers
        defParamCharset: 'utf8',
        limits: {
          fileSize: config.maxFileSizeBytes,
          files: MEDIA_MAX_FILES_PER_UPLOAD,
          fields: 10,
          parts: MEDIA_MAX_FILES_PER_UPLOAD + 10,
        },
      }),
    }),
  ],
  controllers: [MediaAdminController],
  providers: [
    // Swap this binding for an S3 compatible provider; nothing else changes
    { provide: STORAGE_PROVIDER, useClass: LocalStorageProvider },
    ImageProcessorService,
    MediaUsageService,
    MediaReferenceService,
    MediaService,
    MediaPurgeService,
  ],
  exports: [MediaReferenceService, MediaService, STORAGE_PROVIDER, TypeOrmModule],
})
export class MediaModule {}
