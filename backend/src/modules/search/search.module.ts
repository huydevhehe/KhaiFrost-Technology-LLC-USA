import { Module } from '@nestjs/common';
import { SearchAdminController } from './controllers/search-admin.controller';
import { SearchPublicController } from './controllers/search-public.controller';
import { AdminSearchRepository } from './repositories/admin-search.repository';
import { PublicSearchRepository } from './repositories/public-search.repository';
import { AdminSearchService } from './services/admin-search.service';
import { PublicSearchService } from './services/public-search.service';

@Module({
  controllers: [SearchAdminController, SearchPublicController],
  providers: [
    AdminSearchService,
    PublicSearchService,
    AdminSearchRepository,
    PublicSearchRepository,
  ],
})
export class SearchModule {}
