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
import {
  ClientLocationAdminResponseDto,
  CreateClientLocationDto,
  ListClientLocationsQueryDto,
  ReorderClientLocationsDto,
  UpdateClientLocationDto,
} from '../dto/client-location.dto';
import { ClientLocationsService } from '../services/client-locations.service';

@AdminController('client-locations')
export class ClientLocationsAdminController {
  constructor(private readonly locations: ClientLocationsService) {}

  @Get()
  @RequirePermissions(Permission.CLIENT_LOCATION_READ)
  @ApiOperation({ summary: 'List client locations shown as map pins' })
  @ApiOkResponse({ type: [ClientLocationAdminResponseDto] })
  list(
    @Query() query: ListClientLocationsQueryDto,
  ): Promise<PaginatedResponseDto<ClientLocationAdminResponseDto>> {
    return this.locations.list(query);
  }

  @Put('reorder')
  @RequirePermissions(Permission.CLIENT_LOCATION_UPDATE)
  @AuditAction('client-location.reordered', 'ClientLocation')
  @ApiOperation({ summary: 'Set the display order of client locations' })
  reorder(@Body() dto: ReorderClientLocationsDto): Promise<string[]> {
    return this.locations.reorder(dto.ids);
  }

  @Post()
  @RequirePermissions(Permission.CLIENT_LOCATION_CREATE)
  @AuditAction('client-location.created', 'ClientLocation')
  @ApiOperation({ summary: 'Create a client location' })
  @ApiCreatedResponse({ type: ClientLocationAdminResponseDto })
  create(@Body() dto: CreateClientLocationDto): Promise<ClientLocationAdminResponseDto> {
    return this.locations.create(dto);
  }

  @Get(':id')
  @RequirePermissions(Permission.CLIENT_LOCATION_READ)
  @ApiOperation({ summary: 'Read one client location with all locales' })
  @ApiOkResponse({ type: ClientLocationAdminResponseDto })
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<ClientLocationAdminResponseDto> {
    return this.locations.getById(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CLIENT_LOCATION_UPDATE)
  @AuditAction('client-location.updated', 'ClientLocation')
  @ApiOperation({ summary: 'Update a client location (optimistic locking via version)' })
  @ApiOkResponse({ type: ClientLocationAdminResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientLocationDto,
  ): Promise<ClientLocationAdminResponseDto> {
    return this.locations.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.CLIENT_LOCATION_DELETE)
  @AuditAction('client-location.deleted', 'ClientLocation')
  @ApiOperation({ summary: 'Soft delete a client location' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.locations.remove(id);
  }
}
