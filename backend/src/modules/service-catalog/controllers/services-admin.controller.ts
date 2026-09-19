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
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { ListServiceCategoriesQueryDto } from '../dto/list-service-categories-query.dto';
import { ReorderServiceCategoriesDto } from '../dto/reorder-service-categories.dto';
import {
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
} from '../dto/service-category-input.dto';
import {
  ServiceCategoryDetailResponseDto,
  ServiceCategoryListItemResponseDto,
  ServicesOverviewAdminResponseDto,
} from '../dto/service-response.dto';
import { UpdateServicesOverviewDto } from '../dto/update-services-overview.dto';
import { ServiceCategoriesService } from '../services/service-categories.service';
import { ServicesOverviewService } from '../services/services-overview.service';

@AdminController('services')
export class ServicesAdminController {
  constructor(
    private readonly services: ServiceCategoriesService,
    private readonly overview: ServicesOverviewService,
  ) {}

  @Get()
  @RequirePermissions(Permission.SERVICE_READ)
  @ApiOperation({ summary: 'List service categories (paginated, filter by status/search)' })
  @ApiOkResponse({ type: [ServiceCategoryListItemResponseDto] })
  list(
    @Query() query: ListServiceCategoriesQueryDto,
  ): Promise<PaginatedResponseDto<ServiceCategoryListItemResponseDto>> {
    return this.services.list(query);
  }

  @Get('overview')
  @RequirePermissions(Permission.SERVICE_READ)
  @ApiOperation({ summary: 'Read the services overview blocks (stats, process, why-us)' })
  @ApiOkResponse({ type: ServicesOverviewAdminResponseDto })
  getOverview(): Promise<ServicesOverviewAdminResponseDto> {
    return this.overview.get();
  }

  @Put('overview')
  @RequirePermissions(Permission.SERVICE_UPDATE)
  @AuditAction('service-overview.updated', 'ServicesOverview')
  @ApiOperation({ summary: 'Replace the services overview blocks present in the payload' })
  @ApiOkResponse({ type: ServicesOverviewAdminResponseDto })
  updateOverview(
    @Body() dto: UpdateServicesOverviewDto,
  ): Promise<ServicesOverviewAdminResponseDto> {
    return this.overview.update(dto);
  }

  @Put('reorder')
  @RequirePermissions(Permission.SERVICE_UPDATE)
  @AuditAction('service.reordered', 'ServiceCategory')
  @ApiOperation({ summary: 'Set the display order of service categories' })
  reorder(@Body() dto: ReorderServiceCategoriesDto): Promise<string[]> {
    return this.services.reorder(dto.ids);
  }

  @Post()
  @RequirePermissions(Permission.SERVICE_CREATE)
  @AuditAction('service.created', 'ServiceCategory')
  @ApiOperation({ summary: 'Create a service category as a draft' })
  @ApiCreatedResponse({ type: ServiceCategoryDetailResponseDto })
  create(@Body() dto: CreateServiceCategoryDto): Promise<ServiceCategoryDetailResponseDto> {
    return this.services.create(dto);
  }

  @Get(':id')
  @RequirePermissions(Permission.SERVICE_READ)
  @ApiOperation({ summary: 'Read one service category with all locales and blocks' })
  @ApiOkResponse({ type: ServiceCategoryDetailResponseDto })
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceCategoryDetailResponseDto> {
    return this.services.getById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SERVICE_UPDATE)
  @AuditAction('service.updated', 'ServiceCategory')
  @ApiOperation({ summary: 'Update a service category (optimistic locking via version)' })
  @ApiOkResponse({ type: ServiceCategoryDetailResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryDetailResponseDto> {
    return this.services.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.SERVICE_PUBLISH)
  @AuditAction('service.published', 'ServiceCategory')
  @ApiOperation({ summary: 'Publish (needs vi and en for every required field)' })
  @ApiOkResponse({ type: ServiceCategoryDetailResponseDto })
  publish(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceCategoryDetailResponseDto> {
    return this.services.publish(id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.SERVICE_PUBLISH)
  @AuditAction('service.unpublished', 'ServiceCategory')
  @ApiOperation({ summary: 'Return a published or archived service to draft' })
  @ApiOkResponse({ type: ServiceCategoryDetailResponseDto })
  unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceCategoryDetailResponseDto> {
    return this.services.unpublish(id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.SERVICE_PUBLISH)
  @AuditAction('service.archived', 'ServiceCategory')
  @ApiOperation({ summary: 'Archive a service category' })
  @ApiOkResponse({ type: ServiceCategoryDetailResponseDto })
  archive(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceCategoryDetailResponseDto> {
    return this.services.archive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.SERVICE_DELETE)
  @AuditAction('service.deleted', 'ServiceCategory')
  @ApiOperation({ summary: 'Soft delete a service category' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.services.remove(id);
  }
}
