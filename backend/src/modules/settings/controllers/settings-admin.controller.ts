import { Body, Get, Param, ParseEnumPipe, Put } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { SettingGroup } from '../constants/setting-group';
import { SettingResponseDto, UpdateSettingDto } from '../dto/setting.dto';
import { SettingsService } from '../services/settings.service';

@AdminController('settings')
export class SettingsAdminController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequirePermissions(Permission.SETTING_READ)
  @ApiOperation({ summary: 'All settings groups (defaults for groups never saved)' })
  list(): Promise<SettingResponseDto[]> {
    return this.settings.listAdmin();
  }

  @Get(':group')
  @RequirePermissions(Permission.SETTING_READ)
  @ApiOperation({ summary: 'One settings group' })
  @ApiParam({ name: 'group', enum: SettingGroup })
  get(
    @Param('group', new ParseEnumPipe(SettingGroup)) group: SettingGroup,
  ): Promise<SettingResponseDto> {
    return this.settings.getAdmin(group);
  }

  @Put(':group')
  @RequirePermissions(Permission.SETTING_UPDATE)
  @AuditAction('setting.updated', 'SiteSetting')
  @ApiOperation({ summary: 'Replace one settings group (validated per group, version required)' })
  @ApiParam({ name: 'group', enum: SettingGroup })
  update(
    @Param('group', new ParseEnumPipe(SettingGroup)) group: SettingGroup,
    @Body() dto: UpdateSettingDto,
  ): Promise<SettingResponseDto> {
    return this.settings.update(group, dto);
  }
}
