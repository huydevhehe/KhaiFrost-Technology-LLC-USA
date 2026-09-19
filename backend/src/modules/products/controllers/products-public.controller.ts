import { Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicController } from '../../../common/decorators/public-controller.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PublicProductListQueryDto } from '../dto/public-product-list-query.dto';
import {
  ProductCardDto,
  ProductSlugDto,
  PublicProductDetailDto,
} from '../dto/product-response.dto';
import { ProductsService } from '../services/products.service';

@PublicController('products')
export class ProductsPublicController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List published products (filters, search, sort, pagination)' })
  @ApiResponse({ status: 200, type: ProductCardDto, isArray: true })
  list(@Query() query: PublicProductListQueryDto): Promise<PaginatedResponseDto<ProductCardDto>> {
    return this.products.listPublic(query);
  }

  @Get('slugs')
  @ApiOperation({ summary: 'Slugs of all published products (sitemap, static generation)' })
  @ApiResponse({ status: 200, type: ProductSlugDto, isArray: true })
  slugs(): Promise<ProductSlugDto[]> {
    return this.products.listSlugs();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Published product detail in the requested locale' })
  @ApiResponse({ status: 200, type: PublicProductDetailDto })
  detail(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
  ): Promise<PublicProductDetailDto> {
    return this.products.getPublicDetail(slug, query.locale);
  }
}
