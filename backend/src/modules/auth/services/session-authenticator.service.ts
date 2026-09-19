import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request, Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
} from '../../../common/constants/cookie-names';
import { Role } from '../../../common/enums/role.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { authConfig } from '../../../config/auth.config';
import { UserStatus } from '../../users/enums/user-status.enum';
import { ADMIN_SESSION_ABSOLUTE_MAX_MS } from '../constants/auth-constants';
import { ActiveSessionRecord, AuthSessionService } from './auth-session.service';
import { AuthCookieService } from './auth-cookie.service';
import { AdminSessionClaims, TokenService } from './token.service';

export interface AdminSessionState {
  active: boolean;
  expiresAt: Date | null;
}

function readCookie(request: Request, name: string): string | undefined {
  const value = (request.cookies as Record<string, unknown> | undefined)?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

@Injectable()
export class SessionAuthenticator {
  constructor(
    private readonly tokens: TokenService,
    private readonly sessions: AuthSessionService,
    private readonly cookies: AuthCookieService,
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
  ) {}

  // Returns null for anything that is not a currently valid, active login
  async authenticate(request: Request, response: Response): Promise<AuthenticatedUser | null> {
    const accessToken = readCookie(request, ACCESS_COOKIE_NAME);
    if (!accessToken) return null;
    const claims = this.tokens.verifyAccessToken(accessToken);
    if (!claims) return null;

    const record = await this.sessions.findActiveWithUser(claims.sid);
    if (!record || record.userId !== claims.sub || record.status !== UserStatus.ACTIVE) return null;

    return {
      id: record.userId,
      role: record.role,
      sessionId: record.sessionId,
      adminSessionActive: this.resolveAdminSession(request, response, record).active,
      mustChangePassword: record.mustChangePassword === true,
    };
  }

  // Describes the elevated session for status endpoints; never re-issues cookies
  adminSessionState(request: Request, user: AuthenticatedUser): AdminSessionState {
    if (!user.adminSessionActive) return { active: false, expiresAt: null };
    const claims = this.readAdminClaims(request);
    if (!claims) return { active: false, expiresAt: null };
    const expiresAt = Math.min(claims.exp * 1000, claims.sat + ADMIN_SESSION_ABSOLUTE_MAX_MS);
    return { active: true, expiresAt: new Date(expiresAt) };
  }

  private resolveAdminSession(
    request: Request,
    response: Response,
    record: ActiveSessionRecord,
  ): AdminSessionState {
    const inactive: AdminSessionState = { active: false, expiresAt: null };
    if (record.role === Role.CUSTOMER) return inactive;

    const claims = this.readAdminClaims(request);
    if (!claims) return inactive;
    // Bound to the exact login it was issued for
    if (claims.sub !== record.userId || claims.sid !== record.sessionId) return inactive;

    const now = Date.now();
    if (now - claims.sat >= ADMIN_SESSION_ABSOLUTE_MAX_MS) return inactive;
    if (record.adminSessionEndedAt && claims.sat <= record.adminSessionEndedAt.getTime()) {
      return inactive;
    }

    const ttlMs = this.config.adminSessionTtlMinutes * 60_000;
    if (now - claims.iat * 1000 > ttlMs / 2) {
      this.cookies.setAdminSessionCookie(
        response,
        this.tokens.signAdminSessionToken({ sub: claims.sub, sid: claims.sid, sat: claims.sat }),
      );
    }
    return {
      active: true,
      expiresAt: new Date(Math.min(claims.exp * 1000, claims.sat + ADMIN_SESSION_ABSOLUTE_MAX_MS)),
    };
  }

  private readAdminClaims(request: Request): AdminSessionClaims | null {
    const token = readCookie(request, ADMIN_SESSION_COOKIE_NAME);
    return token ? this.tokens.verifyAdminSessionToken(token) : null;
  }
}
