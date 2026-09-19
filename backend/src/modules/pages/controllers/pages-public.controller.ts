import { Get, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { PublicPageDto, PublicPageRouteDto } from '../dto/page-responses.dto';
import { PublicPageQueryDto } from '../dto/page-requests.dto';
import { PagePublicService } from '../services/page-public.service';

@PublicController('pages')
export class PagesPublicController {
  constructor(private readonly pages: PagePublicService) {}

  @Get()
  @ApiOperation({ summary: 'Published routes (path, template, last update) for route generation' })
  routes(): Promise<PublicPageRouteDto[]> {
    return this.pages.listRoutes();
  }

  @Get('by-path')
  @ApiOperation({
    summary: 'A published page with only its published, visible sections resolved to one locale',
  })
  byPath(@Query() query: PublicPageQueryDto): Promise<PublicPageDto> {
    return this.pages.getByPath(query.path, query.locale);
  }
}
