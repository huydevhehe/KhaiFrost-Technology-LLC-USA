import { Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { PublicProjectListQueryDto } from '../dto/project-queries.dto';
import {
  PublicProjectCardResponseDto,
  PublicProjectCategoryResponseDto,
  PublicProjectDetailResponseDto,
} from '../dto/project-response.dto';
import { PublicProjectsService } from '../services/public-projects.service';

@PublicController('projects')
export class ProjectsPublicController {
  constructor(private readonly projects: PublicProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Published projects (category slug and featured filters)' })
  @ApiOkResponse({ type: [PublicProjectCardResponseDto] })
  list(
    @Query() query: PublicProjectListQueryDto,
  ): Promise<PaginatedResponseDto<PublicProjectCardResponseDto>> {
    return this.projects.list(query);
  }

  @Get('slugs')
  @ApiOperation({ summary: 'Slugs of published projects (static generation, sitemap)' })
  slugs(): Promise<{ slug: string; updatedAt: Date }[]> {
    return this.projects.listSlugs();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Project categories with the number of published projects' })
  @ApiOkResponse({ type: [PublicProjectCategoryResponseDto] })
  categories(@Query() query: LocaleQueryDto): Promise<PublicProjectCategoryResponseDto[]> {
    return this.projects.listCategories(query.locale);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Published project by slug' })
  @ApiOkResponse({ type: PublicProjectDetailResponseDto })
  detail(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
  ): Promise<PublicProjectDetailResponseDto> {
    return this.projects.getBySlug(slug, query.locale);
  }
}
