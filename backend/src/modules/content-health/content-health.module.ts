import { Module } from '@nestjs/common';
import { ContentHealthAdminController } from './controllers/content-health-admin.controller';
import { ContentHealthPublicController } from './controllers/content-health-public.controller';
import { ContentHealthRepository } from './repositories/content-health.repository';
import { ContentHealthService } from './services/content-health.service';
import { PublicContentHealthService } from './services/public-content-health.service';

@Module({
  controllers: [ContentHealthAdminController, ContentHealthPublicController],
  providers: [ContentHealthRepository, ContentHealthService, PublicContentHealthService],
})
export class ContentHealthModule {}
