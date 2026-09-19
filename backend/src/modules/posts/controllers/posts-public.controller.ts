import { Get, Header, Param, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { PUBLIC_CACHE_CONTROL } from '../constants/post-constraints';
import {
  PublicPostDetailResponse,
  PublicPostListItemResponse,
  PublicPostSlugResponse,
} from '../dto/post-public-response.dto';
import { PublicPostListQueryDto } from '../dto/public-post-queries.dto';
import { PostsService } from '../services/posts.service';

@PublicController('posts')
export class PostsPublicController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE_CONTROL)
  @ApiOperation({ summary: 'List published articles' })
  list(
    @Query() query: PublicPostListQueryDto,
  ): Promise<PaginatedResponseDto<PublicPostListItemResponse>> {
    return this.posts.list(query);
  }

  // Declared before :slug so it is not treated as an article slug
  @Get('slugs')
  @Header('Cache-Control', PUBLIC_CACHE_CONTROL)
  @ApiOperation({ summary: 'All published slugs, for static generation and sitemaps' })
  listSlugs(): Promise<PublicPostSlugResponse[]> {
    return this.posts.listSlugs();
  }

  @Get(':slug')
  @Header('Cache-Control', PUBLIC_CACHE_CONTROL)
  @ApiOperation({
    summary: 'One published article with SEO data, related and neighbouring articles',
  })
  get(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
  ): Promise<PublicPostDetailResponse> {
    return this.posts.getBySlug(slug, query.locale);
  }
}
