import { Get, Header, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PUBLIC_CACHE_CONTROL } from '../constants/post-constraints';
import { PublicPostCategoryResponse } from '../dto/post-public-response.dto';
import { PostCategoriesService } from '../services/post-categories.service';

@PublicController('post-categories')
export class PostCategoriesPublicController {
  constructor(private readonly categories: PostCategoriesService) {}

  @Get()
  @Header('Cache-Control', PUBLIC_CACHE_CONTROL)
  @ApiOperation({ summary: 'Active categories with the number of published articles' })
  list(@Query() query: LocaleQueryDto): Promise<PublicPostCategoryResponse[]> {
    return this.categories.listForPublic(query.locale);
  }
}
