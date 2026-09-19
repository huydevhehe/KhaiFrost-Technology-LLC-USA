import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { RequestContextService } from '../../../common/context/request-context.service';
import { Role } from '../../../common/enums/role.enum';
import { authConfig } from '../../../config/auth.config';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { User } from '../../users/entities/user.entity';
import { UserStatus } from '../../users/enums/user-status.enum';
import {
  AuthAuditAction,
  NON_PERSISTENT_SESSION_TTL_MS,
  REFRESH_REUSE_GRACE_MS,
} from '../constants/auth-constants';
import { AuthSession } from '../entities/auth-session.entity';
import { sessionExpired } from '../errors/auth-errors';
import { TokenService } from './token.service';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ActiveSessionRecord {
  sessionId: string;
  userId: string;
  role: Role;
  status: UserStatus;
  adminSessionEndedAt: Date | null;
  mustChangePassword: boolean;
}

export interface IssuedSession {
  session: AuthSession;
  refreshToken: string;
}

@Injectable()
export class AuthSessionService {
  constructor(
    @InjectRepository(AuthSession) private readonly sessions: Repository<AuthSession>,
    private readonly tokens: TokenService,
    private readonly requestContext: RequestContextService,
    private readonly auditLog: AuditLogService,
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
  ) {}

  async create(userId: string, rememberMe: boolean): Promise<IssuedSession> {
    const id = randomUUID();
    const { token, hash } = this.tokens.generateRefreshToken(id);
    const session = await this.sessions.save(
      this.sessions.create({
        id,
        userId,
        familyId: randomUUID(),
        refreshTokenHash: hash,
        previousRefreshTokenHash: null,
        rotatedAt: null,
        userAgent: this.requestContext.userAgent?.slice(0, 400) ?? null,
        ipAddress: this.requestContext.ipAddress?.slice(0, 64) ?? null,
        expiresAt: this.expiryFor(rememberMe),
        rememberMe,
      }),
    );
    return { session, refreshToken: token };
  }

  // One indexed lookup joining the user, used on every authenticated request
  async findActiveWithUser(sessionId: string): Promise<ActiveSessionRecord | null> {
    const row = await this.sessions
      .createQueryBuilder('session')
      .innerJoin(User, 'user', 'user.id = session.userId AND user.deletedAt IS NULL')
      .select('session.id', 'sessionId')
      .addSelect('session.userId', 'userId')
      .addSelect('session.adminSessionEndedAt', 'adminSessionEndedAt')
      .addSelect('user.role', 'role')
      .addSelect('user.status', 'status')
      .addSelect('user.mustChangePassword', 'mustChangePassword')
      .where('session.id = :sessionId', { sessionId })
      .andWhere('session.revokedAt IS NULL')
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .getRawOne<ActiveSessionRecord>();
    return row ?? null;
  }

  // Rotates the refresh secret in place; presenting an already rotated secret revokes the whole family
  async rotate(rawRefreshToken: unknown): Promise<IssuedSession> {
    const parsed = this.tokens.parseRefreshToken(rawRefreshToken);
    if (!parsed) throw sessionExpired();

    const session = await this.sessions.findOne({ where: { id: parsed.sessionId } });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw sessionExpired();
    }

    const presentedHash = this.tokens.hashRefreshSecret(parsed.secret);
    if (!this.tokens.safeEqual(presentedHash, session.refreshTokenHash)) {
      await this.handleStaleToken(session, presentedHash);
      throw sessionExpired();
    }

    const next = this.tokens.generateRefreshToken(session.id);
    const now = new Date();
    const result = await this.sessions
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        refreshTokenHash: next.hash,
        previousRefreshTokenHash: presentedHash,
        rotatedAt: now,
        lastUsedAt: now,
        expiresAt: this.expiryFor(session.rememberMe),
        userAgent: this.requestContext.userAgent?.slice(0, 400) ?? session.userAgent,
        ipAddress: this.requestContext.ipAddress?.slice(0, 64) ?? session.ipAddress,
      })
      .where('id = :id AND refresh_token_hash = :hash AND revoked_at IS NULL', {
        id: session.id,
        hash: presentedHash,
      })
      .execute();
    // Lost a race with a concurrent rotation of the same token
    if (!result.affected) throw sessionExpired();

    return {
      session: { ...session, expiresAt: this.expiryFor(session.rememberMe) },
      refreshToken: next.token,
    };
  }

  async revoke(sessionId: string, reason: string): Promise<boolean> {
    const result = await this.sessions
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where('id = :sessionId AND revoked_at IS NULL', { sessionId })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async revokeOwned(userId: string, sessionId: string, reason: string): Promise<boolean> {
    const result = await this.sessions
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where('id = :sessionId AND user_id = :userId AND revoked_at IS NULL', { sessionId, userId })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async revokeAllForUser(
    userId: string,
    reason: string,
    options: { exceptSessionId?: string; manager?: EntityManager } = {},
  ): Promise<void> {
    const builder = (options.manager?.getRepository(AuthSession) ?? this.sessions)
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where('user_id = :userId AND revoked_at IS NULL', { userId });
    if (options.exceptSessionId) {
      builder.andWhere('id <> :exceptSessionId', { exceptSessionId: options.exceptSessionId });
    }
    await builder.execute();
  }

  async revokeFamily(familyId: string, reason: string): Promise<void> {
    await this.sessions
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where('family_id = :familyId AND revoked_at IS NULL', { familyId })
      .execute();
  }

  async endAdminElevation(sessionId: string): Promise<void> {
    await this.sessions.update({ id: sessionId }, { adminSessionEndedAt: new Date() });
  }

  listActive(userId: string): Promise<AuthSession[]> {
    return this.sessions
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .andWhere('session.revokedAt IS NULL')
      .andWhere('session.expiresAt > :now', { now: new Date() })
      .orderBy('session.lastUsedAt', 'DESC')
      .getMany();
  }

  async deleteStale(olderThan: Date): Promise<number> {
    const result = await this.sessions
      .createQueryBuilder()
      .delete()
      .from(AuthSession)
      .where('expires_at < :olderThan OR (revoked_at IS NOT NULL AND revoked_at < :olderThan)', {
        olderThan,
      })
      .execute();
    return result.affected ?? 0;
  }

  findById(sessionId: string): Promise<AuthSession | null> {
    return this.sessions.findOne({ where: { id: sessionId, revokedAt: IsNull() } });
  }

  private async handleStaleToken(session: AuthSession, presentedHash: string): Promise<void> {
    const isPrevious =
      !!session.previousRefreshTokenHash &&
      this.tokens.safeEqual(presentedHash, session.previousRefreshTokenHash);
    if (!isPrevious) return;

    const rotatedRecently =
      !!session.rotatedAt && Date.now() - session.rotatedAt.getTime() <= REFRESH_REUSE_GRACE_MS;
    if (rotatedRecently) return;

    await this.revokeFamily(session.familyId, 'refresh-reuse');
    await this.auditLog.record({
      action: AuthAuditAction.REFRESH_REUSE_DETECTED,
      entityName: 'AuthSession',
      entityId: session.id,
      actorId: session.userId,
      metadata: { familyId: session.familyId },
    });
  }

  private expiryFor(rememberMe: boolean): Date {
    const ttl = rememberMe ? this.config.refreshTtlDays * DAY_MS : NON_PERSISTENT_SESSION_TTL_MS;
    return new Date(Date.now() + ttl);
  }
}
