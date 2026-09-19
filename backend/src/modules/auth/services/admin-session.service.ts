import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { Role } from '../../../common/enums/role.enum';
import { forbidden, unauthorized } from '../../../common/exceptions/exception.factories';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { authConfig } from '../../../config/auth.config';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { UsersService } from '../../users/services/users.service';
import { AuthAuditAction } from '../constants/auth-constants';
import { AdminSessionStatusDto } from '../dto/auth-response.dto';
import { accountLocked, invalidPassword } from '../errors/auth-errors';
import { AuthSessionService } from './auth-session.service';
import { SessionAuthenticator } from './session-authenticator.service';
import { TokenService } from './token.service';

export interface StartedAdminSession {
  token: string;
  status: AdminSessionStatusDto;
}

@Injectable()
export class AdminSessionService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: AuthSessionService,
    private readonly tokens: TokenService,
    private readonly authenticator: SessionAuthenticator,
    private readonly auditLog: AuditLogService,
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
  ) {}

  // The user must prove the password again before the dashboard opens
  async start(user: AuthenticatedUser, password: string): Promise<StartedAdminSession> {
    if (user.role === Role.CUSTOMER) throw forbidden();
    const record = await this.users.findByIdWithPasswordHash(user.id);
    if (!record) throw unauthorized();

    if (record.lockedUntil && record.lockedUntil.getTime() > Date.now()) throw accountLocked();

    if (!(await this.users.verifyPassword(record, password))) {
      const outcome = await this.users.recordFailedLogin(
        record.id,
        this.config.loginMaxFailedAttempts,
        this.config.loginLockMinutes,
      );
      await this.auditLog.record({
        action: AuthAuditAction.ADMIN_SESSION_FAILED,
        entityName: 'User',
        entityId: record.id,
        actorId: record.id,
        actorName: record.fullName,
        actorRole: record.role,
        metadata: { locked: outcome.locked },
      });
      if (outcome.locked) {
        await this.auditLog.record({
          action: AuthAuditAction.ACCOUNT_LOCKED,
          entityName: 'User',
          entityId: record.id,
          actorId: record.id,
          actorName: record.fullName,
          actorRole: record.role,
          metadata: { reason: 'too_many_failed_admin_sessions' },
        });
      }
      throw invalidPassword();
    }

    await this.users.recordSuccessfulLogin(record.id, { touchLastLogin: false });
    const startedAt = Date.now();
    const token = this.tokens.signAdminSessionToken({
      sub: record.id,
      sid: user.sessionId,
      sat: startedAt,
    });
    await this.auditLog.record({
      action: AuthAuditAction.ADMIN_SESSION_STARTED,
      entityName: 'User',
      entityId: record.id,
      actorId: record.id,
      actorName: record.fullName,
      actorRole: record.role,
    });
    return {
      token,
      status: {
        active: true,
        expiresAt: new Date(startedAt + this.config.adminSessionTtlMinutes * 60_000).toISOString(),
      },
    };
  }

  status(request: Request, user: AuthenticatedUser): AdminSessionStatusDto {
    const state = this.authenticator.adminSessionState(request, user);
    return { active: state.active, expiresAt: state.expiresAt?.toISOString() ?? null };
  }

  async end(user: AuthenticatedUser): Promise<void> {
    await this.sessions.endAdminElevation(user.sessionId);
    await this.auditLog.record({
      action: AuthAuditAction.ADMIN_SESSION_ENDED,
      entityName: 'User',
      entityId: user.id,
      actorId: user.id,
      actorRole: user.role,
    });
  }
}
