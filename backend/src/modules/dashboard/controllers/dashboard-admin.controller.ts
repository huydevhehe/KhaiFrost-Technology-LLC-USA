import { Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { DashboardSummaryResponseDto } from '../dto/dashboard-summary-response.dto';
import { RecentActivityItemDto } from '../dto/recent-activity-response.dto';
import { DashboardService } from '../services/dashboard.service';

@AdminController('dashboard')
export class DashboardAdminController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Business counters with the change against the previous 30 days' })
  @ApiOkResponse({ type: DashboardSummaryResponseDto })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LocaleQueryDto,
  ): Promise<DashboardSummaryResponseDto> {
    return this.dashboard.getSummary(query.locale, user.role);
  }

  @Get('recent-activity')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({
    summary: 'Latest audit entries; security events are hidden without audit-log:read',
  })
  @ApiOkResponse({ type: [RecentActivityItemDto] })
  recentActivity(@CurrentUser() user: AuthenticatedUser): Promise<RecentActivityItemDto[]> {
    return this.dashboard.getRecentActivity(user);
  }
}
