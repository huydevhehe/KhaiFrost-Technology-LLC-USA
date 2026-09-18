import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from './entities/media-asset.entity';
import { MediaReferenceService } from './services/media-reference.service';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset])],
  providers: [MediaReferenceService],
  exports: [MediaReferenceService, TypeOrmModule],
})
export class MediaModule {}
