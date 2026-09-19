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
import { ApiCreatedResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { CreateProjectCategoryDto, UpdateProjectCategoryDto } from '../dto/project-category.dto';
import { ProjectCategoryResponseDto } from '../dto/project-response.dto';
import { ProjectCategoriesService } from '../services/project-categories.service';

@AdminController('project-categories')
export class ProjectCategoriesAdminController {
  constructor(private readonly categories: ProjectCategoriesService) {}

  @Get()
  @RequirePermissions(Permission.PROJECT_READ)
  @ApiOperation({ summary: 'List project categories' })
  @ApiOkResponse({ type: [ProjectCategoryResponseDto] })
  list(): Promise<ProjectCategoryResponseDto[]> {
    return this.categories.list();
  }

  @Post()
  @RequirePermissions(Permission.PROJECT_UPDATE_ANY)
  @AuditAction('project-category.created', 'ProjectCategory')
  @ApiOperation({ summary: 'Create a project category (both locales required)' })
  @ApiCreatedResponse({ type: ProjectCategoryResponseDto })
  create(@Body() dto: CreateProjectCategoryDto): Promise<ProjectCategoryResponseDto> {
    return this.categories.create(dto);
  }

  @Get(':id')
  @RequirePermissions(Permission.PROJECT_READ)
  @ApiOperation({ summary: 'Read one project category' })
  @ApiOkResponse({ type: ProjectCategoryResponseDto })
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectCategoryResponseDto> {
    return this.categories.getById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PROJECT_UPDATE_ANY)
  @AuditAction('project-category.updated', 'ProjectCategory')
  @ApiOperation({ summary: 'Update a project category (optimistic locking via version)' })
  @ApiOkResponse({ type: ProjectCategoryResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectCategoryDto,
  ): Promise<ProjectCategoryResponseDto> {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.PROJECT_DELETE)
  @AuditAction('project-category.deleted', 'ProjectCategory')
  @ApiOperation({ summary: 'Soft delete a category that no project uses' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.categories.remove(id);
  }
}
