import { Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { ThrottlePublicSearch } from '../constants/search.constants';
import { PublicSearchQueryDto } from '../dto/search-query.dto';
import { PublicSearchResultDto } from '../dto/search-response.dto';
import { PublicSearchService } from '../services/public-search.service';

@PublicController('search')
export class SearchPublicController {
  constructor(private readonly search: PublicSearchService) {}

  @Get()
  @ThrottlePublicSearch()
  @ApiOperation({ summary: 'Search published posts, products, projects and services' })
  @ApiOkResponse({ type: [PublicSearchResultDto] })
  find(@Query() query: PublicSearchQueryDto): Promise<PublicSearchResultDto[]> {
    return this.search.search(query);
  }
}
