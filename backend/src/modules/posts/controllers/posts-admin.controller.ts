import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { notFound } from '../../../common/exceptions/exception.factories';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { CreatePostDto } from '../dto/create-post.dto';
import { ListPostsQueryDto } from '../dto/list-posts-query.dto';
import { AdminPostDetailResponse, AdminPostListItemResponse } from '../dto/post-admin-response.dto';
import { PublishPostDto } from '../dto/publish-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { PostsAdminService } from '../services/posts-admin.service';

const PostIdPipe = new ParseUUIDPipe({ exceptionFactory: () => notFound('Post') });

@AdminController('posts')
export class PostsAdminController {
  constructor(private readonly postsAdmin: PostsAdminService) {}

  @Get()
  @RequirePermissions(Permission.POST_READ)
  @ApiOperation({ summary: 'List posts with filters, search, sorting and pagination' })
  list(
    @Query() query: ListPostsQueryDto,
  ): Promise<PaginatedResponseDto<AdminPostListItemResponse>> {
    return this.postsAdmin.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.POST_READ)
  @ApiOperation({ summary: 'Get a post with both translations' })
  get(@Param('id', PostIdPipe) id: string): Promise<AdminPostDetailResponse> {
    return this.postsAdmin.getById(id);
  }

  @Post()
  @RequirePermissions(Permission.POST_CREATE)
  @AuditAction('post.created', 'Post')
  @ApiOperation({ summary: 'Create a draft post' })
  create(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminPostDetailResponse> {
    return this.postsAdmin.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions(Permission.POST_UPDATE_OWN)
  @AuditAction('post.updated', 'Post')
  @ApiOperation({ summary: 'Update a post (optimistic locking via version)' })
  update(
    @Param('id', PostIdPipe) id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminPostDetailResponse> {
    return this.postsAdmin.update(id, dto, user);
  }

  @Post(':id/submit-for-review')
  @HttpCode(200)
  @RequirePermissions(Permission.POST_UPDATE_OWN)
  @AuditAction('post.submitted-for-review', 'Post')
  @ApiOperation({ summary: 'Send a draft to reviewers' })
  submitForReview(
    @Param('id', PostIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminPostDetailResponse> {
    return this.postsAdmin.submitForReview(id, user);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @RequirePermissions(Permission.POST_PUBLISH)
  @AuditAction('post.published', 'Post')
  @ApiOperation({ summary: 'Publish now, or schedule with a future publishedAt' })
  publish(
    @Param('id', PostIdPipe) id: string,
    @Body() dto: PublishPostDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminPostDetailResponse> {
    return this.postsAdmin.publish(id, user, dto.publishedAt);
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @RequirePermissions(Permission.POST_PUBLISH)
  @AuditAction('post.unpublished', 'Post')
  @ApiOperation({ summary: 'Take a published post back to draft' })
  unpublish(
    @Param('id', PostIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminPostDetailResponse> {
    return this.postsAdmin.unpublish(id, user);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermissions(Permission.POST_PUBLISH)
  @AuditAction('post.archived', 'Post')
  @ApiOperation({ summary: 'Archive a post' })
  archive(
    @Param('id', PostIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminPostDetailResponse> {
    return this.postsAdmin.archive(id, user);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @RequirePermissions(Permission.POST_PUBLISH)
  @AuditAction('post.restored', 'Post')
  @ApiOperation({ summary: 'Move an archived post back to draft' })
  restore(
    @Param('id', PostIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminPostDetailResponse> {
    return this.postsAdmin.restore(id, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(Permission.POST_DELETE)
  @AuditAction('post.deleted', 'Post')
  @ApiOperation({ summary: 'Soft delete a post' })
  async remove(@Param('id', PostIdPipe) id: string): Promise<void> {
    await this.postsAdmin.remove(id);
  }
}
