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
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Permission } from '../../../common/constants/permissions';
import { AdminController } from '../../../common/decorators/admin-controller.decorator';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { PaginatedResponseDto } from '../../../common/dto/paginated-response.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto, UserWithTemporaryPasswordDto } from '../dto/user-response.dto';
import { StaffUsersService } from '../services/staff-users.service';

@AdminController('users')
export class StaffUsersController {
  constructor(private readonly staffUsers: StaffUsersService) {}

  @Get()
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'List back office users' })
  list(@Query() query: ListUsersQueryDto): Promise<PaginatedResponseDto<UserResponseDto>> {
    return this.staffUsers.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'Get a back office user' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.staffUsers.get(id);
  }

  @Post()
  @RequirePermissions(Permission.USER_CREATE)
  @AuditAction('user.created', 'User')
  @ApiOperation({ summary: 'Create a back office user (temporary password returned once)' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ): Promise<UserWithTemporaryPasswordDto> {
    return this.staffUsers.create(actor, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_UPDATE)
  @AuditAction('user.updated', 'User')
  @ApiOperation({ summary: 'Update a back office user' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.staffUsers.update(actor, id, dto);
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.USER_LOCK)
  @AuditAction('user.locked', 'User')
  @ApiOperation({ summary: 'Lock a user; all their sessions stop working immediately' })
  lock(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.staffUsers.lock(actor, id);
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.USER_LOCK)
  @AuditAction('user.unlocked', 'User')
  @ApiOperation({ summary: 'Unlock a user' })
  unlock(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.staffUsers.unlock(actor, id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.USER_RESET_PASSWORD)
  @AuditAction('user.password-reset', 'User')
  @ApiOperation({ summary: 'Set a new temporary password (returned once) and revoke sessions' })
  resetPassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserWithTemporaryPasswordDto> {
    return this.staffUsers.resetPassword(actor, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.USER_DELETE)
  @AuditAction('user.deleted', 'User')
  @ApiOperation({ summary: 'Soft delete a user' })
  remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.staffUsers.remove(actor, id);
  }
}
