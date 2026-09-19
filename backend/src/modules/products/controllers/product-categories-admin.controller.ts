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
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from '../dto/product-category.dto';
import { AdminProductCategoryDto } from '../dto/product-response.dto';
import { ProductCategoriesService } from '../services/product-categories.service';

@AdminController('product-categories')
export class ProductCategoriesAdminController {
  constructor(private readonly categories: ProductCategoriesService) {}

  @Get()
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiOperation({ summary: 'List all product categories' })
  @ApiResponse({ status: 200, type: AdminProductCategoryDto, isArray: true })
  list(): Promise<AdminProductCategoryDto[]> {
    return this.categories.listAdmin();
  }

  @Get(':id')
  @RequirePermissions(Permission.PRODUCT_READ)
  @ApiOperation({ summary: 'Get a product category with both translations' })
  @ApiResponse({ status: 200, type: AdminProductCategoryDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AdminProductCategoryDto> {
    return this.categories.getAdmin(id);
  }

  @Post()
  @RequirePermissions(Permission.PRODUCT_CATEGORY_MANAGE)
  @AuditAction('product-category.created', 'ProductCategory')
  @ApiOperation({ summary: 'Create a product category' })
  @ApiResponse({ status: 201, type: AdminProductCategoryDto })
  create(@Body() dto: CreateProductCategoryDto): Promise<AdminProductCategoryDto> {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PRODUCT_CATEGORY_MANAGE)
  @AuditAction('product-category.updated', 'ProductCategory')
  @ApiOperation({ summary: 'Update a product category' })
  @ApiResponse({ status: 200, type: AdminProductCategoryDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCategoryDto,
  ): Promise<AdminProductCategoryDto> {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.PRODUCT_CATEGORY_MANAGE)
  @AuditAction('product-category.deleted', 'ProductCategory')
  @ApiOperation({ summary: 'Soft delete an empty product category' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categories.remove(id);
  }
}
