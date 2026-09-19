import {
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { LocaleQueryDto } from '../../../common/dto/locale-query.dto';
import { ResponseWithMeta } from '../../../common/dto/response-with-meta';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  ListNotificationsQueryDto,
  MarkAllReadResponseDto,
  NotificationResponseDto,
  UnreadCountResponseDto,
} from '../dto/notification.dto';
import { NotificationsService } from '../services/notifications.service';

// Any staff role holds dashboard:read, so it doubles as "is staff"; rows are always scoped to the caller
@AdminController('notifications')
export class NotificationsAdminController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'List my notifications (meta includes unreadCount)' })
  @ApiOkResponse({ type: [NotificationResponseDto] })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<ResponseWithMeta<NotificationResponseDto[], Record<string, unknown>>> {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Number of my unread notifications (bell badge)' })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  unreadCount(@CurrentUser() user: AuthenticatedUser): Promise<UnreadCountResponseDto> {
    return this.notifications.getUnreadCount(user.id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @ApiOkResponse({ type: MarkAllReadResponseDto })
  markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<MarkAllReadResponseDto> {
    return this.notifications.markAllRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Mark one of my notifications as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: LocaleQueryDto,
  ): Promise<NotificationResponseDto> {
    return this.notifications.markRead(user.id, id, query.locale);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Delete one of my notifications' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notifications.remove(user.id, id);
  }
}
