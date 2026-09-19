import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from '../media/media.module';
import { PagesAdminController } from './controllers/pages-admin.controller';
import { PagesPublicController } from './controllers/pages-public.controller';
import { PageRevision } from './entities/page-revision.entity';
import { PageSectionMedia } from './entities/page-section-media.entity';
import { PageSection } from './entities/page-section.entity';
import { PageTranslation } from './entities/page-translation.entity';
import { Page } from './entities/page.entity';
import { PageMediaResolverService } from './services/page-media-resolver.service';
import { PagePublicService } from './services/page-public.service';
import { PagePublishingService } from './services/page-publishing.service';
import { PageSectionsService } from './services/page-sections.service';
import { PagesService } from './services/pages.service';
import { SectionContentService } from './services/section-content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Page, PageTranslation, PageSection, PageSectionMedia, PageRevision]),
    MediaModule,
  ],
  controllers: [PagesAdminController, PagesPublicController],
  providers: [
    PagesService,
    PageSectionsService,
    PagePublishingService,
    PagePublicService,
    PageMediaResolverService,
    SectionContentService,
  ],
  exports: [PagesService, PageSectionsService, PagePublishingService],
})
export class PagesModule {}
