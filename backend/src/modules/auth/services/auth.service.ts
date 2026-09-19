import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent, UserRegisteredEvent } from '../../../common/constants/domain-events';
import { Role } from '../../../common/enums/role.enum';
import { notFound, unauthorized } from '../../../common/exceptions/exception.factories';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { authConfig } from '../../../config/auth.config';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { User } from '../../users/entities/user.entity';
import { UserStatus } from '../../users/enums/user-status.enum';
import { PasswordHasher } from '../../users/services/password-hasher.service';
import { UsersService, parseIdentifier } from '../../users/services/users.service';
import { AuthAuditAction } from '../constants/auth-constants';
import { AuthUserResponseDto, SessionSummaryDto } from '../dto/auth-response.dto';
import { ChangePasswordDto, LoginDto, RegisterDto } from '../dto/auth-request.dto';
import { AuthSession } from '../entities/auth-session.entity';
import { accountLocked, invalidCredentials, invalidPassword } from '../errors/auth-errors';
import { toAuthUser } from '../mappers/auth-user.mapper';
import { maskIdentifier } from '../utils/mask-identifier';
import { AuthSessionService } from './auth-session.service';
import { TokenService } from './token.service';

export interface AuthResult {
  user: AuthUserResponseDto;
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwordHasher: PasswordHasher,
    private readonly sessions: AuthSessionService,
    private readonly tokens: TokenService,
    private readonly auditLog: AuditLogService,
    private readonly events: EventEmitter2,
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.users.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      role: Role.CUSTOMER,
      preferredLocale: dto.preferredLocale,
    });

    const event: UserRegisteredEvent = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      locale: user.preferredLocale,
    };
    this.events.emit(DomainEvent.USER_REGISTERED, event);
    await this.auditLog.record({
      action: AuthAuditAction.REGISTERED,
      entityName: 'User',
      entityId: user.id,
      ...this.actorOf(user),
    });

    await this.users.recordSuccessfulLogin(user.id, { touchLastLogin: true });
    return this.startSession(user, false);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const identifier = parseIdentifier(dto.identifier);
    const user = identifier ? await this.users.findByIdentifierWithPasswordHash(identifier) : null;

    if (!user) {
      await this.passwordHasher.verifyAgainstDummy(dto.password);
      await this.recordLoginFailure(null, dto.identifier, 'unknown_identifier');
      throw invalidCredentials();
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      await this.passwordHasher.verifyAgainstDummy(dto.password);
      await this.recordLoginFailure(user, dto.identifier, 'temporarily_locked');
      throw accountLocked();
    }

    if (!(await this.users.verifyPassword(user, dto.password))) {
      const outcome = await this.users.recordFailedLogin(
        user.id,
        this.config.loginMaxFailedAttempts,
        this.config.loginLockMinutes,
      );
      await this.recordLoginFailure(user, dto.identifier, 'wrong_password');
      if (outcome.locked) {
        await this.auditLog.record({
          action: AuthAuditAction.ACCOUNT_LOCKED,
          entityName: 'User',
          entityId: user.id,
          ...this.actorOf(user),
          metadata: { reason: 'too_many_failed_logins', lockMinutes: this.config.loginLockMinutes },
        });
      }
      throw invalidCredentials();
    }

    // Only someone who proved the password learns that the account was locked by an administrator
    if (user.status === UserStatus.LOCKED) {
      await this.recordLoginFailure(user, dto.identifier, 'account_locked');
      throw accountLocked();
    }

    await this.users.recordSuccessfulLogin(user.id, { touchLastLogin: true });
    if (this.passwordHasher.needsRehash(user.passwordHash)) {
      await this.users.upgradePasswordHash(user.id, dto.password);
    }

    const result = await this.startSession(user, dto.rememberMe === true);
    await this.auditLog.record({
      action: AuthAuditAction.LOGIN_SUCCEEDED,
      entityName: 'User',
      entityId: user.id,
      ...this.actorOf(user),
      metadata: { rememberMe: dto.rememberMe === true },
    });
    return result;
  }

  async refresh(rawRefreshToken: unknown): Promise<AuthResult> {
    const issued = await this.sessions.rotate(rawRefreshToken);
    const user = await this.users.findById(issued.session.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessions.revoke(issued.session.id, 'user-inactive');
      throw unauthorized('The session is no longer valid');
    }
    return {
      user: await this.describeUser(user, false),
      accessToken: this.tokens.signAccessToken({
        sub: user.id,
        role: user.role,
        sid: issued.session.id,
      }),
      refreshToken: issued.refreshToken,
      rememberMe: issued.session.rememberMe,
    };
  }

  // Works for an expired access token too, by proving possession of the refresh token instead
  async logout(user: AuthenticatedUser | undefined, rawRefreshToken: unknown): Promise<void> {
    let sessionId = user?.sessionId;
    let userId = user?.id;
    if (!sessionId) {
      const parsed = this.tokens.parseRefreshToken(rawRefreshToken);
      const session = parsed ? await this.sessions.findById(parsed.sessionId) : null;
      const matches =
        !!parsed &&
        !!session &&
        this.tokens.safeEqual(
          this.tokens.hashRefreshSecret(parsed.secret),
          session.refreshTokenHash,
        );
      if (!session || !matches) return;
      sessionId = session.id;
      userId = session.userId;
    }
    await this.sessions.revoke(sessionId, 'logout');
    await this.auditLog.record({
      action: AuthAuditAction.LOGOUT,
      entityName: 'AuthSession',
      entityId: sessionId,
      actorId: userId ?? null,
    });
  }

  async logoutAll(user: AuthenticatedUser): Promise<void> {
    await this.sessions.revokeAllForUser(user.id, 'logout-all');
    await this.auditLog.record({
      action: AuthAuditAction.LOGOUT_ALL,
      entityName: 'User',
      entityId: user.id,
      actorId: user.id,
      actorRole: user.role,
    });
  }

  async listSessions(user: AuthenticatedUser): Promise<SessionSummaryDto[]> {
    const sessions = await this.sessions.listActive(user.id);
    return sessions.map((session) => this.toSessionSummary(session, user.sessionId));
  }

  async revokeSession(user: AuthenticatedUser, sessionId: string): Promise<void> {
    const revoked = await this.sessions.revokeOwned(user.id, sessionId, 'revoked-by-user');
    if (!revoked) throw notFound('Session');
    await this.auditLog.record({
      action: AuthAuditAction.SESSION_REVOKED,
      entityName: 'AuthSession',
      entityId: sessionId,
      actorId: user.id,
      actorRole: user.role,
    });
  }

  async me(user: AuthenticatedUser): Promise<AuthUserResponseDto> {
    const record = await this.users.findById(user.id);
    if (!record) throw unauthorized();
    return this.describeUser(record, user.adminSessionActive);
  }

  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto): Promise<void> {
    const record = await this.users.findByIdWithPasswordHash(user.id);
    if (!record) throw unauthorized();

    if (!(await this.users.verifyPassword(record, dto.currentPassword))) {
      await this.users.recordFailedLogin(
        record.id,
        this.config.loginMaxFailedAttempts,
        this.config.loginLockMinutes,
      );
      await this.auditLog.record({
        action: AuthAuditAction.PASSWORD_CHANGE_FAILED,
        entityName: 'User',
        entityId: record.id,
        ...this.actorOf(record),
      });
      throw invalidPassword();
    }

    await this.users.setPassword(record.id, dto.newPassword, { mustChangePassword: false });
    await this.sessions.revokeAllForUser(record.id, 'password-changed', {
      exceptSessionId: user.sessionId,
    });
    await this.sessions.endAdminElevation(user.sessionId);
    await this.auditLog.record({
      action: AuthAuditAction.PASSWORD_CHANGED,
      entityName: 'User',
      entityId: record.id,
      ...this.actorOf(record),
    });
  }

  private async startSession(user: User, rememberMe: boolean): Promise<AuthResult> {
    const issued = await this.sessions.create(user.id, rememberMe);
    return {
      user: await this.describeUser(user, false),
      accessToken: this.tokens.signAccessToken({
        sub: user.id,
        role: user.role,
        sid: issued.session.id,
      }),
      refreshToken: issued.refreshToken,
      rememberMe,
    };
  }

  private async describeUser(
    user: User,
    adminSessionActive: boolean,
  ): Promise<AuthUserResponseDto> {
    return toAuthUser(await this.users.toResponse(user), adminSessionActive);
  }

  private toSessionSummary(session: AuthSession, currentSessionId: string): SessionSummaryDto {
    return {
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      rememberMe: session.rememberMe,
      current: session.id === currentSessionId,
    };
  }

  private actorOf(user: Pick<User, 'id' | 'fullName' | 'role'>) {
    return { actorId: user.id, actorName: user.fullName, actorRole: user.role };
  }

  private recordLoginFailure(user: User | null, identifier: string, reason: string): Promise<void> {
    return this.auditLog.record({
      action: AuthAuditAction.LOGIN_FAILED,
      entityName: 'User',
      entityId: user?.id ?? null,
      actorId: user?.id ?? null,
      ...(user && { actorName: user.fullName, actorRole: user.role }),
      metadata: { reason, identifier: maskIdentifier(identifier) },
    });
  }
}
