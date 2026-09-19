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
  Put,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { PublicationStatus } from '../../../common/enums/publication-status.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { CreateProjectDto, UpdateProjectDto } from '../dto/project-input.dto';
import { ListProjectsQueryDto, ReorderProjectsDto } from '../dto/project-queries.dto';
import { ProjectDetailResponseDto, ProjectListItemResponseDto } from '../dto/project-response.dto';
import { ProjectsService } from '../services/projects.service';

@AdminController('projects')
export class ProjectsAdminController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermissions(Permission.PROJECT_READ)
  @ApiOperation({ summary: 'List projects (filter by status, category, featured, mine)' })
  @ApiOkResponse({ type: [ProjectListItemResponseDto] })
  list(
    @Query() query: ListProjectsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResponseDto<ProjectListItemResponseDto>> {
    return this.projects.list(query, user);
  }

  @Put('reorder')
  @RequirePermissions(Permission.PROJECT_UPDATE_ANY)
  @AuditAction('project.reordered', 'Project')
  @ApiOperation({ summary: 'Set the display order of projects' })
  reorder(@Body() dto: ReorderProjectsDto): Promise<string[]> {
    return this.projects.reorder(dto.ids);
  }

  @Post()
  @RequirePermissions(Permission.PROJECT_CREATE)
  @AuditAction('project.created', 'Project')
  @ApiOperation({ summary: 'Create a project draft owned by the caller' })
  @ApiCreatedResponse({ type: ProjectDetailResponseDto })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectDetailResponseDto> {
    return this.projects.create(dto, user);
  }

  @Get(':id')
  @RequirePermissions(Permission.PROJECT_READ)
  @ApiOperation({ summary: 'Read one project with all locales, gallery and sections' })
  @ApiOkResponse({ type: ProjectDetailResponseDto })
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDetailResponseDto> {
    return this.projects.getById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PROJECT_UPDATE_OWN)
  @AuditAction('project.updated', 'Project')
  @ApiOperation({
    summary: 'Update a project (own drafts with update-own, anything with update-any)',
  })
  @ApiOkResponse({ type: ProjectDetailResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectDetailResponseDto> {
    return this.projects.update(id, dto, user);
  }

  @Post(':id/submit-for-review')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PROJECT_UPDATE_OWN)
  @AuditAction('project.submitted-for-review', 'Project')
  @ApiOperation({ summary: 'Send a draft to review' })
  @ApiOkResponse({ type: ProjectDetailResponseDto })
  submitForReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectDetailResponseDto> {
    return this.projects.submitForReview(id, user);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PROJECT_PUBLISH)
  @AuditAction('project.rejected', 'Project')
  @ApiOperation({ summary: 'Send a project in review back to draft' })
  @ApiOkResponse({ type: ProjectDetailResponseDto })
  reject(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDetailResponseDto> {
    return this.projects.changeStatus(id, PublicationStatus.DRAFT, PublicationStatus.IN_REVIEW);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PROJECT_PUBLISH)
  @AuditAction('project.published', 'Project')
  @ApiOperation({ summary: 'Publish (needs vi and en title and summary, and section texts)' })
  @ApiOkResponse({ type: ProjectDetailResponseDto })
  publish(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDetailResponseDto> {
    return this.projects.changeStatus(id, PublicationStatus.PUBLISHED);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PROJECT_PUBLISH)
  @AuditAction('project.unpublished', 'Project')
  @ApiOperation({ summary: 'Return a published or archived project to draft' })
  @ApiOkResponse({ type: ProjectDetailResponseDto })
  unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDetailResponseDto> {
    return this.projects.changeStatus(id, PublicationStatus.DRAFT);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PROJECT_PUBLISH)
  @AuditAction('project.archived', 'Project')
  @ApiOperation({ summary: 'Archive a project' })
  @ApiOkResponse({ type: ProjectDetailResponseDto })
  archive(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectDetailResponseDto> {
    return this.projects.changeStatus(id, PublicationStatus.ARCHIVED);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.PROJECT_DELETE)
  @AuditAction('project.deleted', 'Project')
  @ApiOperation({ summary: 'Soft delete a project' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.projects.remove(id);
  }
}
