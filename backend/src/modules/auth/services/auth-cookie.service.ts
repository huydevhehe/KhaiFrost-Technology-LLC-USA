import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from '../../../common/constants/cookie-names';
import { appConfig } from '../../../config/app.config';
import { authConfig } from '../../../config/auth.config';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthCookieService {
  constructor(
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
    @Inject(authConfig.KEY) private readonly auth: ConfigType<typeof authConfig>,
  ) {}

  setSessionCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string; rememberMe: boolean },
  ): void {
    response.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
      ...this.baseOptions('/'),
      maxAge: this.auth.accessTtlMinutes * 60_000,
    });
    response.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...this.baseOptions(REFRESH_COOKIE_PATH),
      // No maxAge makes it a browser-session cookie when the user did not ask to be remembered
      ...(tokens.rememberMe && { maxAge: this.auth.refreshTtlDays * DAY_MS }),
    });
  }

  setAdminSessionCookie(response: Response, token: string): void {
    response.cookie(ADMIN_SESSION_COOKIE_NAME, token, {
      ...this.baseOptions('/'),
      maxAge: this.auth.adminSessionTtlMinutes * 60_000,
    });
  }

  clearAdminSessionCookie(response: Response): void {
    response.clearCookie(ADMIN_SESSION_COOKIE_NAME, this.baseOptions('/'));
  }

  clearAll(response: Response): void {
    response.clearCookie(ACCESS_COOKIE_NAME, this.baseOptions('/'));
    response.clearCookie(REFRESH_COOKIE_NAME, this.baseOptions(REFRESH_COOKIE_PATH));
    this.clearAdminSessionCookie(response);
  }

  private baseOptions(path: string): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.app.cookieSecure,
      domain: this.app.cookieDomain,
      path,
    };
  }
}
