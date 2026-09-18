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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { MEDIA_MAX_FILES_PER_UPLOAD, MEDIA_UPLOAD_FIELD_NAME } from '../constants/media.constants';
import { ListMediaQueryDto } from '../dto/list-media-query.dto';
import {
  MediaAssetDetailResponseDto,
  MediaAssetResponseDto,
  MediaUploadResponseDto,
} from '../dto/media-asset-response.dto';
import { UpdateMediaDto } from '../dto/update-media.dto';
import { UploadMediaDto } from '../dto/upload-media.dto';
import { MediaService } from '../services/media.service';

@AdminController('media')
export class MediaAdminController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @RequirePermissions(Permission.MEDIA_READ)
  @ApiOperation({ summary: 'List media assets (search, folder, type, sort, pagination)' })
  @ApiResponse({ status: 200, type: [MediaAssetResponseDto] })
  list(@Query() query: ListMediaQueryDto) {
    return this.mediaService.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.MEDIA_READ)
  @ApiOperation({ summary: 'Get one media asset with variants, alt text and usages' })
  @ApiResponse({ status: 200, type: MediaAssetDetailResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.getDetail(id);
  }

  @Post()
  @RequirePermissions(Permission.MEDIA_UPLOAD)
  @AuditAction('media.uploaded', 'MediaAsset')
  @UseInterceptors(FilesInterceptor(MEDIA_UPLOAD_FIELD_NAME, MEDIA_MAX_FILES_PER_UPLOAD))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        folder: { type: 'string', maxLength: 100 },
      },
      required: ['files'],
    },
  })
  @ApiOperation({ summary: 'Upload up to 20 images or PDFs; returns one result per file' })
  @ApiResponse({ status: 201, type: MediaUploadResponseDto })
  upload(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() body: UploadMediaDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.mediaService.uploadMany(
      (files ?? []).map((file) => ({ buffer: file.buffer, originalName: file.originalname })),
      { folder: body.folder, createdById: userId },
    );
  }

  @Patch(':id')
  @RequirePermissions(Permission.MEDIA_UPLOAD)
  @AuditAction('media.updated', 'MediaAsset')
  @ApiOperation({ summary: 'Update display name, folder, alt text and caption (vi/en)' })
  @ApiResponse({ status: 200, type: MediaAssetDetailResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMediaDto) {
    return this.mediaService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.MEDIA_DELETE)
  @AuditAction('media.deleted', 'MediaAsset')
  @ApiOperation({
    summary: 'Soft delete; blocked with 409 MEDIA_IN_USE while content references it',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.mediaService.remove(id);
  }
}
