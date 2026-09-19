import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../../../common/constants/cookie-names';
import { AllowPasswordChangePending } from '../../../common/decorators/allow-password-change-pending.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  ThrottleAuthStandard,
  ThrottleAuthStrict,
} from '../../../common/decorators/throttle-presets.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  StartAdminSessionDto,
} from '../dto/auth-request.dto';
import {
  AcceptedResponseDto,
  AdminSessionStatusDto,
  AuthSessionResultDto,
  AuthUserResponseDto,
  SessionSummaryDto,
} from '../dto/auth-response.dto';
import { AdminSessionService } from '../services/admin-session.service';
import { AuthCookieService } from '../services/auth-cookie.service';
import { AuthResult, AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';

@Controller('auth')
@AllowPasswordChangePending()
@ApiTags('auth')
@ApiCookieAuth(ACCESS_COOKIE_NAME)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
    private readonly adminSession: AdminSessionService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Post('register')
  @Public()
  @ThrottleAuthStrict()
  @ApiOperation({ summary: 'Register a customer account and sign in' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResultDto> {
    return this.respondWithSession(response, await this.auth.register(dto));
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ThrottleAuthStrict()
  @ApiOperation({ summary: 'Sign in with email or phone and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResultDto> {
    return this.respondWithSession(response, await this.auth.login(dto));
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ThrottleAuthStandard()
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResultDto> {
    try {
      const result = await this.auth.refresh(
        (request.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE_NAME],
      );
      return this.respondWithSession(response, result);
    } catch (error) {
      this.cookies.clearAll(response);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ThrottleAuthStandard()
  @ApiOperation({ summary: 'Sign out of the current session' })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(
      request.user,
      (request.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE_NAME],
    );
    this.cookies.clearAll(response);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ThrottleAuthStandard()
  @ApiOperation({ summary: 'Sign out of every session' })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logoutAll(user);
    this.cookies.clearAll(response);
  }

  @Get('me')
  @ApiOperation({ summary: 'Current user with role, permissions and admin session state' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserResponseDto> {
    return this.auth.me(user);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List my active sessions' })
  sessions(@CurrentUser() user: AuthenticatedUser): Promise<SessionSummaryDto[]> {
    return this.auth.listSessions(user);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke one of my sessions' })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.revokeSession(user, sessionId);
    if (sessionId === user.sessionId) this.cookies.clearAll(response);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @ThrottleAuthStrict()
  @ApiOperation({ summary: 'Email a 6-digit password reset code (always accepted)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<AcceptedResponseDto> {
    await this.passwordReset.request(dto.identifier);
    return { accepted: true };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ThrottleAuthStrict()
  @ApiOperation({ summary: 'Set a new password with the emailed code; signs out everywhere' })
  reset(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.passwordReset.reset(dto);
  }

  @Post('admin-session')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.OWNER, Role.ADMIN, Role.STAFF)
  @ThrottleAuthStrict()
  @ApiCookieAuth(ADMIN_SESSION_COOKIE_NAME)
  @ApiOperation({ summary: 'Re-enter the password to open an elevated admin session' })
  async startAdminSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartAdminSessionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminSessionStatusDto> {
    const started = await this.adminSession.start(user, dto.password);
    this.cookies.setAdminSessionCookie(response, started.token);
    return started.status;
  }

  @Get('admin-session')
  @ApiOperation({ summary: 'Is the elevated admin session active?' })
  adminSessionStatus(
    @Req() request: AuthenticatedRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): AdminSessionStatusDto {
    return this.adminSession.status(request, user);
  }

  @Delete('admin-session')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close the elevated admin session' })
  async endAdminSession(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.adminSession.end(user);
    this.cookies.clearAdminSessionCookie(response);
  }

  private respondWithSession(response: Response, result: AuthResult): AuthSessionResultDto {
    this.cookies.setSessionCookies(response, result);
    return { user: result.user };
  }
}
