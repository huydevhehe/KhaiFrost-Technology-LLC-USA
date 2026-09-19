import { Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { PublicServiceListQueryDto } from '../dto/public-service-queries.dto';
import {
  PublicServiceCardResponseDto,
  PublicServiceDetailResponseDto,
  PublicServicesOverviewResponseDto,
} from '../dto/service-response.dto';
import { PublicServiceCatalogService } from '../services/public-service-catalog.service';

@PublicController('services')
export class ServicesPublicController {
  constructor(private readonly catalog: PublicServiceCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List published services as cards' })
  @ApiOkResponse({ type: [PublicServiceCardResponseDto] })
  list(
    @Query() query: PublicServiceListQueryDto,
  ): Promise<PaginatedResponseDto<PublicServiceCardResponseDto>> {
    return this.catalog.list(query);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Everything the services overview page needs in one call' })
  @ApiOkResponse({ type: PublicServicesOverviewResponseDto })
  overview(@Query() query: LocaleQueryDto): Promise<PublicServicesOverviewResponseDto> {
    return this.catalog.getOverview(query.locale);
  }

  @Get('slugs')
  @ApiOperation({ summary: 'Slugs of published services (static generation, sitemap)' })
  slugs(): Promise<{ slug: string; updatedAt: Date }[]> {
    return this.catalog.listSlugs();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Published service category page by slug' })
  @ApiOkResponse({ type: PublicServiceDetailResponseDto })
  detail(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
  ): Promise<PublicServiceDetailResponseDto> {
    return this.catalog.getBySlug(slug, query.locale);
  }
}
