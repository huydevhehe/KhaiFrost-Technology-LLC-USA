import { Body, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AllowPasswordChangePending } from '../../../common/decorators/allow-password-change-pending.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CustomerController } from '../../../common/decorators/customer-controller.decorator';
import { ThrottleAuthStandard } from '../../../common/decorators/throttle-presets.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { ChangePasswordDto } from '../dto/auth-request.dto';
import { AuthCookieService } from '../services/auth-cookie.service';
import { AuthService } from '../services/auth.service';

@CustomerController('password')
export class AccountPasswordController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post()
  @AllowPasswordChangePending()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ThrottleAuthStandard()
  @ApiOperation({ summary: 'Change my password; other sessions are signed out' })
  async change(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.changePassword(user, dto);
    this.cookies.clearAdminSessionCookie(response);
  }
}
