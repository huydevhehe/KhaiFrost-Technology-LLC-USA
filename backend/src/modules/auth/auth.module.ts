import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UsersModule } from '../users/users.module';
import { AccountPasswordController } from './controllers/account-password.controller';
import { AuthController } from './controllers/auth.controller';
import { AuthIdentity } from './entities/auth-identity.entity';
import { AuthSession } from './entities/auth-session.entity';
import { PasswordResetCode } from './entities/password-reset-code.entity';
import { AccessControlGuard } from './guards/access-control.guard';
import { IdentityEventsListener } from './listeners/identity-events.listener';
import { AdminSessionService } from './services/admin-session.service';
import { AuthCleanupService } from './services/auth-cleanup.service';
import { AuthCookieService } from './services/auth-cookie.service';
import { AuthSessionService } from './services/auth-session.service';
import { AuthService } from './services/auth.service';
import { PasswordResetService } from './services/password-reset.service';
import { SessionAuthenticator } from './services/session-authenticator.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthIdentity, AuthSession, PasswordResetCode]),
    JwtModule.register({}),
    UsersModule,
    AuditLogModule,
  ],
  controllers: [AuthController, AccountPasswordController],
  providers: [
    TokenService,
    AuthCookieService,
    AuthSessionService,
    SessionAuthenticator,
    AuthService,
    PasswordResetService,
    AdminSessionService,
    IdentityEventsListener,
    AuthCleanupService,
    { provide: APP_GUARD, useClass: AccessControlGuard },
  ],
  exports: [AuthService, AuthSessionService],
})
export class AuthModule {}
