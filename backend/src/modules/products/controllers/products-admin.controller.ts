import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { AdminProductListQueryDto } from '../dto/admin-product-list-query.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { AdminProductDetailDto, AdminProductListItemDto } from '../dto/product-response.dto';
import { PublishProductDto, TransitionProductDto } from '../dto/transition-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsAdminService } from '../services/products-admin.service';

@AdminController('products')
export class ProductsAdminController {
  constructor(private readonly productsAdmin: ProductsAdminService) {}

  @Get()
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiOperation({
    summary:
      'List products with filters (status, type, category, featured, search, missing locale)',
  })
  @ApiResponse({ status: 200, type: AdminProductListItemDto, isArray: true })
  list(
    @Query() query: AdminProductListQueryDto,
  ): Promise<PaginatedResponseDto<AdminProductListItemDto>> {
    return this.productsAdmin.list(query);
  }

  @Post()
  @RequirePermissions(Permission.PRODUCT_CREATE)
  @AuditAction('product.created', 'Product')
  @ApiOperation({ summary: 'Create a draft product' })
  @ApiResponse({ status: 201, type: AdminProductDetailDto })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminProductDetailDto> {
    return this.productsAdmin.create(dto, user);
  }

  @Get(':id')
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiOperation({ summary: 'Get a product with all translations, prices and gallery' })
  @ApiResponse({ status: 200, type: AdminProductDetailDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AdminProductDetailDto> {
    return this.productsAdmin.get(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRODUCT_UPDATE_OWN)
  @AuditAction('product.updated', 'Product')
  @ApiOperation({ summary: 'Update a product (prices and gallery use replace-all semantics)' })
  @ApiResponse({ status: 200, type: AdminProductDetailDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminProductDetailDto> {
    return this.productsAdmin.update(id, dto, user);
  }

  @Post(':id/submit-for-review')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PRODUCT_UPDATE_OWN)
  @AuditAction('product.submitted-for-review', 'Product')
  @ApiOperation({ summary: 'Move a draft to in_review' })
  @ApiResponse({ status: 200, type: AdminProductDetailDto })
  submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminProductDetailDto> {
    return this.productsAdmin.transition(id, 'submit', dto, user);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PRODUCT_PUBLISH)
  @AuditAction('product.published', 'Product')
  @ApiOperation({ summary: 'Publish a product (needs vi and en content, and a price rule)' })
  @ApiResponse({ status: 200, type: AdminProductDetailDto })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminProductDetailDto> {
    return this.productsAdmin.transition(id, 'publish', dto, user);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PRODUCT_PUBLISH)
  @AuditAction('product.unpublished', 'Product')
  @ApiOperation({ summary: 'Send a published, in-review or archived product back to draft' })
  @ApiResponse({ status: 200, type: AdminProductDetailDto })
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminProductDetailDto> {
    return this.productsAdmin.transition(id, 'unpublish', dto, user);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PRODUCT_PUBLISH)
  @AuditAction('product.archived', 'Product')
  @ApiOperation({ summary: 'Archive a product' })
  @ApiResponse({ status: 200, type: AdminProductDetailDto })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminProductDetailDto> {
    return this.productsAdmin.transition(id, 'archive', dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.PRODUCT_DELETE)
  @AuditAction('product.deleted', 'Product')
  @ApiOperation({ summary: 'Soft delete a product' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsAdmin.remove(id);
  }
}
