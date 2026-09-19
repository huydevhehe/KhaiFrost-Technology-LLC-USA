import { Body, Get, Param, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { AdminNavigationMenuDto } from '../dto/navigation-response.dto';
import { ReplaceNavigationDto } from '../dto/replace-navigation.dto';
import { NavigationService } from '../services/navigation.service';

@AdminController('navigation')
export class NavigationAdminController {
  constructor(private readonly navigation: NavigationService) {}

  @Get()
  @RequirePermissions(Permission.NAVIGATION_MANAGE)
  @ApiOperation({ summary: 'List saved navigation menus' })
  list(): Promise<{ key: string; version: number }[]> {
    return this.navigation.listMenuKeys();
  }

  @Get(':menuKey')
  @RequirePermissions(Permission.NAVIGATION_MANAGE)
  @ApiOperation({ summary: 'Get a menu tree (empty tree when never saved)' })
  get(@Param('menuKey') menuKey: string): Promise<AdminNavigationMenuDto> {
    return this.navigation.getAdminMenu(menuKey);
  }

  @Put(':menuKey')
  @RequirePermissions(Permission.NAVIGATION_MANAGE)
  @AuditAction('navigation.updated', 'NavigationMenu')
  @ApiOperation({ summary: 'Replace the whole menu tree atomically' })
  replace(
    @Param('menuKey') menuKey: string,
    @Body() dto: ReplaceNavigationDto,
  ): Promise<AdminNavigationMenuDto> {
    return this.navigation.replaceMenu(menuKey, dto);
  }
}
