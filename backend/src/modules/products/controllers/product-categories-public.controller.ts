import { Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PublicProductCategoryDto } from '../dto/product-response.dto';
import { ProductCategoriesService } from '../services/product-categories.service';

@PublicController('product-categories')
export class ProductCategoriesPublicController {
  constructor(private readonly categories: ProductCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Active product categories with the number of published products' })
  @ApiResponse({ status: 200, type: PublicProductCategoryDto, isArray: true })
  list(@Query() query: LocaleQueryDto): Promise<PublicProductCategoryDto[]> {
    return this.categories.listPublic(query.locale);
  }
}
