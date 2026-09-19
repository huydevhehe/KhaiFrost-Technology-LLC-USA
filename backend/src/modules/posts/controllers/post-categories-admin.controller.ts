import { Body, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { notFound } from '../../../common/exceptions/exception.factories';
import { AdminPostCategoryResponse } from '../dto/post-admin-response.dto';
import { CreatePostCategoryDto, UpdatePostCategoryDto } from '../dto/post-category-input.dto';
import { PostCategoriesService } from '../services/post-categories.service';

const CategoryIdPipe = new ParseUUIDPipe({ exceptionFactory: () => notFound('Post category') });

@AdminController('post-categories')
export class PostCategoriesAdminController {
  constructor(private readonly categories: PostCategoriesService) {}

  @Get()
  @RequirePermissions(Permission.POST_READ)
  @ApiOperation({ summary: 'List all post categories with post counts' })
  list(): Promise<AdminPostCategoryResponse[]> {
    return this.categories.listForAdmin();
  }

  @Get(':id')
  @RequirePermissions(Permission.POST_READ)
  @ApiOperation({ summary: 'Get a post category with both translations' })
  get(@Param('id', CategoryIdPipe) id: string): Promise<AdminPostCategoryResponse> {
    return this.categories.getForAdmin(id);
  }

  @Post()
  @RequirePermissions(Permission.POST_CATEGORY_MANAGE)
  @AuditAction('post-category.created', 'PostCategory')
  @ApiOperation({ summary: 'Create a post category' })
  create(@Body() dto: CreatePostCategoryDto): Promise<AdminPostCategoryResponse> {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.POST_CATEGORY_MANAGE)
  @AuditAction('post-category.updated', 'PostCategory')
  @ApiOperation({ summary: 'Update a post category (optimistic locking via version)' })
  update(
    @Param('id', CategoryIdPipe) id: string,
    @Body() dto: UpdatePostCategoryDto,
  ): Promise<AdminPostCategoryResponse> {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.POST_CATEGORY_MANAGE)
  @AuditAction('post-category.deleted', 'PostCategory')
  @ApiOperation({ summary: 'Delete a post category that has no posts' })
  async remove(@Param('id', CategoryIdPipe) id: string): Promise<void> {
    await this.categories.remove(id);
  }
}
