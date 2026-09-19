import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  SectionTypeDefinition,
  listSectionTypeDefinitions,
} from '../constants/section-types.registry';
import {
  CreatePageDto,
  CreateSectionDto,
  ListPagesQueryDto,
  PublishPageDto,
  ReorderSectionsDto,
  RevertRevisionDto,
  UpdatePageDto,
  UpdateSectionDto,
} from '../dto/page-requests.dto';
import {
  PageDetailDto,
  PublicPageDto,
  PageRevisionDetailDto,
  PageRevisionSummaryDto,
  PageSectionDto,
  PageSummaryDto,
} from '../dto/page-responses.dto';
import { PagePublicService } from '../services/page-public.service';
import { PagePublishingService } from '../services/page-publishing.service';
import { PageSectionsService } from '../services/page-sections.service';
import { PagesService } from '../services/pages.service';

@AdminController('pages')
export class PagesAdminController {
  constructor(
    private readonly pages: PagesService,
    private readonly sections: PageSectionsService,
    private readonly publishing: PagePublishingService,
    private readonly publicPages: PagePublicService,
  ) {}

  @Get()
  @RequirePermissions(Permission.PAGE_READ)
  @ApiOperation({ summary: 'List pages with search, status filter and sorting' })
  list(@Query() query: ListPagesQueryDto): Promise<PaginatedResponseDto<PageSummaryDto>> {
    return this.pages.list(query);
  }

  @Get('section-types')
  @RequirePermissions(Permission.PAGE_READ)
  @ApiOperation({ summary: 'Section type registry: field schemas the editor renders forms from' })
  sectionTypes(): SectionTypeDefinition[] {
    return listSectionTypeDefinitions();
  }

  @Get(':id')
  @RequirePermissions(Permission.PAGE_READ)
  @ApiOperation({
    summary: 'A page with translations, sections (draft content) and their type schemas',
  })
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<PageDetailDto> {
    return this.pages.getDetail(id);
  }

  @Post()
  @RequirePermissions(Permission.PAGE_UPDATE)
  @AuditAction('page.created', 'Page')
  @ApiOperation({ summary: 'Create a custom page (draft)' })
  create(@Body() dto: CreatePageDto): Promise<PageDetailDto> {
    return this.pages.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PAGE_UPDATE)
  @AuditAction('page.updated', 'Page')
  @ApiOperation({
    summary: 'Update titles, SEO, template or path (path is fixed for system pages)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePageDto,
  ): Promise<PageDetailDto> {
    return this.pages.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.PAGE_PUBLISH)
  @AuditAction('page.deleted', 'Page')
  @ApiOperation({ summary: 'Delete a custom page (system pages are protected)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.pages.remove(id);
  }

  @Post(':id/sections')
  @RequirePermissions(Permission.PAGE_UPDATE)
  @AuditAction('page.section-added', 'PageSection')
  @ApiOperation({ summary: 'Add a section to a page' })
  addSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSectionDto,
  ): Promise<PageSectionDto> {
    return this.sections.add(id, dto);
  }

  @Post(':id/sections/reorder')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PAGE_UPDATE)
  @AuditAction('page.sections-reordered', 'PageSection')
  @ApiOperation({ summary: 'Reorder all sections of a page in one transaction' })
  reorder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderSectionsDto,
  ): Promise<PageSectionDto[]> {
    return this.sections.reorder(id, dto);
  }

  @Patch(':id/sections/:sectionId')
  @RequirePermissions(Permission.PAGE_UPDATE)
  @AuditAction('page.section-updated', 'PageSection')
  @ApiOperation({ summary: 'Update the draft content, visibility or position of a section' })
  updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<PageSectionDto> {
    return this.sections.update(id, sectionId, dto);
  }

  @Delete(':id/sections/:sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.PAGE_UPDATE)
  @AuditAction('page.section-deleted', 'PageSection')
  @ApiOperation({ summary: 'Delete a custom section (system sections can only be hidden)' })
  removeSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ): Promise<void> {
    return this.sections.remove(id, sectionId);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PAGE_PUBLISH)
  @AuditAction('page.published', 'Page')
  @ApiOperation({
    summary: 'Publish the drafts (needs vi and en for every required text) and write a revision',
  })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishPageDto,
  ): Promise<PageDetailDto> {
    return this.publishing.publish(id, dto);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PAGE_PUBLISH)
  @AuditAction('page.unpublished', 'Page')
  @ApiOperation({ summary: 'Take a page offline (drafts and revisions are kept)' })
  unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<PageDetailDto> {
    return this.pages.unpublish(id);
  }

  @Post(':id/discard-draft')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PAGE_UPDATE)
  @AuditAction('page.draft-discarded', 'Page')
  @ApiOperation({ summary: 'Discard unpublished changes and return to the published content' })
  discardDraft(@Param('id', ParseUUIDPipe) id: string): Promise<PageDetailDto> {
    return this.publishing.discardDraft(id);
  }

  @Get(':id/revisions')
  @RequirePermissions(Permission.PAGE_READ)
  @ApiOperation({ summary: 'Revision history (newest first)' })
  revisions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PageRevisionSummaryDto>> {
    return this.publishing.listRevisions(id, query);
  }

  @Get(':id/revisions/:revisionNumber')
  @RequirePermissions(Permission.PAGE_READ)
  @ApiOperation({ summary: 'One revision including its snapshot' })
  revision(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionNumber', ParseIntPipe) revisionNumber: number,
  ): Promise<PageRevisionDetailDto> {
    return this.publishing.getRevision(id, revisionNumber);
  }

  @Post(':id/revisions/:revisionNumber/revert')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PAGE_UPDATE)
  @AuditAction('page.reverted', 'Page')
  @ApiOperation({ summary: 'Restore a revision as draft content (does not publish)' })
  revert(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionNumber', ParseIntPipe) revisionNumber: number,
    @Body() dto: RevertRevisionDto,
  ): Promise<PageDetailDto> {
    return this.publishing.revert(id, revisionNumber, dto);
  }

  @Get(':id/preview')
  @RequirePermissions(Permission.PAGE_READ)
  @ApiOperation({
    summary: 'Draft content resolved for one locale, as the public page would render it',
  })
  preview(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LocaleQueryDto,
  ): Promise<PublicPageDto> {
    return this.publicPages.preview(id, query.locale);
  }
}
