import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../../common/enums/role.enum';
import { authConfig } from '../../../config/auth.config';

export interface AccessTokenClaims {
  sub: string;
  role: Role;
  sid: string;
}

export interface AdminSessionClaims {
  sub: string;
  sid: string;
  // Milliseconds since epoch of the password re-entry; survives sliding re-issues to enforce the absolute cap
  sat: number;
  iat: number;
  exp: number;
}

const ALGORITHM = 'HS256';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFRESH_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
  ) {}

  signAccessToken(claims: AccessTokenClaims): string {
    return this.jwt.sign(
      { role: claims.role, sid: claims.sid, typ: 'access' },
      {
        secret: this.config.accessSecret,
        algorithm: ALGORITHM,
        subject: claims.sub,
        expiresIn: this.config.accessTtlMinutes * 60,
      },
    );
  }

  verifyAccessToken(token: string): AccessTokenClaims | null {
    try {
      const payload = this.jwt.verify<Record<string, unknown>>(token, {
        secret: this.config.accessSecret,
        algorithms: [ALGORITHM],
      });
      if (payload.typ !== 'access') return null;
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
      return { sub: payload.sub, sid: payload.sid, role: payload.role as Role };
    } catch {
      return null;
    }
  }

  signAdminSessionToken(claims: { sub: string; sid: string; sat: number }): string {
    return this.jwt.sign(
      { sid: claims.sid, sat: claims.sat, typ: 'admin' },
      {
        secret: this.config.adminSessionSecret,
        algorithm: ALGORITHM,
        subject: claims.sub,
        expiresIn: this.config.adminSessionTtlMinutes * 60,
      },
    );
  }

  verifyAdminSessionToken(token: string): AdminSessionClaims | null {
    try {
      const payload = this.jwt.verify<Record<string, unknown>>(token, {
        secret: this.config.adminSessionSecret,
        algorithms: [ALGORITHM],
      });
      if (
        payload.typ !== 'admin' ||
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string' ||
        typeof payload.sat !== 'number' ||
        typeof payload.iat !== 'number' ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }
      return {
        sub: payload.sub,
        sid: payload.sid,
        sat: payload.sat,
        iat: payload.iat,
        exp: payload.exp,
      };
    } catch {
      return null;
    }
  }

  // The cookie carries "<sessionId>.<secret>"; only a keyed hash of the secret is stored
  generateRefreshToken(sessionId: string): { token: string; hash: string } {
    const secret = randomBytes(32).toString('base64url');
    return { token: `${sessionId}.${secret}`, hash: this.hashRefreshSecret(secret) };
  }

  parseRefreshToken(raw: unknown): { sessionId: string; secret: string } | null {
    if (typeof raw !== 'string') return null;
    const [sessionId, secret, ...rest] = raw.split('.');
    if (rest.length > 0 || !sessionId || !secret) return null;
    if (!UUID_PATTERN.test(sessionId) || !REFRESH_SECRET_PATTERN.test(secret)) return null;
    return { sessionId, secret };
  }

  hashRefreshSecret(secret: string): string {
    return createHmac('sha256', this.config.refreshSecret)
      .update(`refresh:${secret}`)
      .digest('hex');
  }

  hashResetCode(userId: string, code: string): string {
    return createHmac('sha256', this.config.refreshSecret)
      .update(`password-reset:${userId}:${code}`)
      .digest('hex');
  }

  safeEqual(first: string, second: string): boolean {
    const firstBuffer = Buffer.from(first);
    const secondBuffer = Buffer.from(second);
    return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
  }
}
