import { Body, Delete, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AuditAction } from '../../../common/decorators/audit-action.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CustomerController } from '../../../common/decorators/customer-controller.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ThrottleAuthStrict } from '../../../common/decorators/throttle-presets.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { DeleteAccountDto, UpdateProfileDto } from '../dto/customer.dto';
import { CustomerAccountService } from '../services/customer-account.service';

@CustomerController('profile')
export class CustomerProfileController {
  constructor(private readonly account: CustomerAccountService) {}

  @Get()
  @ApiOperation({ summary: 'My profile' })
  get(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.account.getProfile(user.id);
  }

  @Patch()
  @AuditAction('profile.updated', 'User')
  @ApiOperation({
    summary: 'Update my profile (email changes need verification and are not offered yet)',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.account.updateProfile(user.id, dto);
  }
}

@CustomerController('account')
export class CustomerAccountController {
  constructor(private readonly account: CustomerAccountService) {}

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.CUSTOMER)
  @ThrottleAuthStrict()
  @ApiOperation({ summary: 'Delete my account after confirming the password' })
  remove(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto): Promise<void> {
    return this.account.deleteAccount(user.id, dto.currentPassword);
  }
}
