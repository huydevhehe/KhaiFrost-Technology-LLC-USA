import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import {
  ACCESS_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
} from '../../../common/constants/cookie-names';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../users/enums/user-status.enum';
import { AuthCookieService } from './auth-cookie.service';
import { ActiveSessionRecord, AuthSessionService } from './auth-session.service';
import { SessionAuthenticator } from './session-authenticator.service';
import { TokenService } from './token.service';

const config = {
  accessSecret: 'a'.repeat(40),
  accessTtlMinutes: 15,
  refreshSecret: 'r'.repeat(40),
  refreshTtlDays: 30,
  adminSessionSecret: 'd'.repeat(40),
  adminSessionTtlMinutes: 30,
  passwordResetCodeTtlMinutes: 10,
  loginMaxFailedAttempts: 5,
  loginLockMinutes: 15,
};

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';

describe('SessionAuthenticator', () => {
  const tokens = new TokenService(new JwtService(), config);
  let findActive: jest.Mock;
  let revoke: jest.Mock;
  let touchLastUsedAt: jest.Mock;
  let setAdminCookie: jest.Mock;
  let authenticator: SessionAuthenticator;

  const record = (overrides: Partial<ActiveSessionRecord> = {}): ActiveSessionRecord => ({
    sessionId: SESSION_ID,
    userId: USER_ID,
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
    adminSessionEndedAt: null,
    mustChangePassword: false,
    lastUsedAt: new Date(),
    ...overrides,
  });

  const accessCookie = (claims = { sub: USER_ID, sid: SESSION_ID, role: Role.ADMIN }) =>
    tokens.signAccessToken(claims);
  const requestWith = (cookies: Record<string, string>) => ({ cookies }) as unknown as Request;
  const response = {} as Response;

  beforeEach(() => {
    findActive = jest.fn().mockResolvedValue(record());
    revoke = jest.fn().mockResolvedValue(true);
    touchLastUsedAt = jest.fn().mockResolvedValue(undefined);
    setAdminCookie = jest.fn();
    authenticator = new SessionAuthenticator(
      tokens,
      {
        findActiveWithUser: findActive,
        revoke,
        touchLastUsedAt,
      } as unknown as AuthSessionService,
      { setAdminSessionCookie: setAdminCookie } as unknown as AuthCookieService,
      config,
    );
  });

  describe('access cookie', () => {
    it('returns null without a cookie or with garbage', async () => {
      expect(await authenticator.authenticate(requestWith({}), response)).toBeNull();
      expect(
        await authenticator.authenticate(
          requestWith({ [ACCESS_COOKIE_NAME]: 'garbage' }),
          response,
        ),
      ).toBeNull();
      expect(findActive).not.toHaveBeenCalled();
    });

    it('rejects a token signed with another secret', async () => {
      const foreign = new TokenService(new JwtService(), {
        ...config,
        accessSecret: 'z'.repeat(40),
      }).signAccessToken({ sub: USER_ID, sid: SESSION_ID, role: Role.OWNER });
      expect(
        await authenticator.authenticate(requestWith({ [ACCESS_COOKIE_NAME]: foreign }), response),
      ).toBeNull();
    });

    it('rejects an admin session token presented as an access token', async () => {
      const adminToken = tokens.signAdminSessionToken({
        sub: USER_ID,
        sid: SESSION_ID,
        sat: Date.now(),
      });
      expect(
        await authenticator.authenticate(
          requestWith({ [ACCESS_COOKIE_NAME]: adminToken }),
          response,
        ),
      ).toBeNull();
    });

    it('takes the role from the database, not from the token', async () => {
      findActive.mockResolvedValue(record({ role: Role.STAFF }));
      const user = await authenticator.authenticate(
        requestWith({ [ACCESS_COOKIE_NAME]: accessCookie() }),
        response,
      );
      expect(user).toEqual({
        id: USER_ID,
        role: Role.STAFF,
        sessionId: SESSION_ID,
        adminSessionActive: false,
        mustChangePassword: false,
      });
    });

    it('returns null when the session is revoked, expired or missing', async () => {
      findActive.mockResolvedValue(null);
      expect(
        await authenticator.authenticate(
          requestWith({ [ACCESS_COOKIE_NAME]: accessCookie() }),
          response,
        ),
      ).toBeNull();
    });

    it('returns null when the session belongs to another user', async () => {
      findActive.mockResolvedValue(record({ userId: '33333333-3333-4333-8333-333333333333' }));
      expect(
        await authenticator.authenticate(
          requestWith({ [ACCESS_COOKIE_NAME]: accessCookie() }),
          response,
        ),
      ).toBeNull();
    });

    it('returns null for a locked user', async () => {
      findActive.mockResolvedValue(record({ status: UserStatus.LOCKED }));
      expect(
        await authenticator.authenticate(
          requestWith({ [ACCESS_COOKIE_NAME]: accessCookie() }),
          response,
        ),
      ).toBeNull();
    });
  });

  describe('idle timeout', () => {
    const staleLastUsedAt = () => new Date(Date.now() - 10 * 60_000 - 1000);

    it('logs out an admin idle past 10 minutes and revokes the session', async () => {
      findActive.mockResolvedValue(record({ role: Role.ADMIN, lastUsedAt: staleLastUsedAt() }));
      expect(
        await authenticator.authenticate(
          requestWith({ [ACCESS_COOKIE_NAME]: accessCookie() }),
          response,
        ),
      ).toBeNull();
      expect(revoke).toHaveBeenCalledWith(SESSION_ID, 'idle-timeout');
      expect(touchLastUsedAt).not.toHaveBeenCalled();
    });

    it('logs out staff idle past 10 minutes', async () => {
      findActive.mockResolvedValue(record({ role: Role.STAFF, lastUsedAt: staleLastUsedAt() }));
      expect(
        await authenticator.authenticate(
          requestWith({
            [ACCESS_COOKIE_NAME]: accessCookie({ sub: USER_ID, sid: SESSION_ID, role: Role.STAFF }),
          }),
          response,
        ),
      ).toBeNull();
      expect(revoke).toHaveBeenCalledWith(SESSION_ID, 'idle-timeout');
    });

    it('never times out the owner, no matter how idle', async () => {
      findActive.mockResolvedValue(record({ role: Role.OWNER, lastUsedAt: staleLastUsedAt() }));
      const user = await authenticator.authenticate(
        requestWith({
          [ACCESS_COOKIE_NAME]: accessCookie({ sub: USER_ID, sid: SESSION_ID, role: Role.OWNER }),
        }),
        response,
      );
      expect(user).not.toBeNull();
      expect(revoke).not.toHaveBeenCalled();
      expect(touchLastUsedAt).not.toHaveBeenCalled();
    });

    it('never times out a customer', async () => {
      findActive.mockResolvedValue(record({ role: Role.CUSTOMER, lastUsedAt: staleLastUsedAt() }));
      const user = await authenticator.authenticate(
        requestWith({
          [ACCESS_COOKIE_NAME]: accessCookie({
            sub: USER_ID,
            sid: SESSION_ID,
            role: Role.CUSTOMER,
          }),
        }),
        response,
      );
      expect(user).not.toBeNull();
      expect(revoke).not.toHaveBeenCalled();
    });

    it('stays logged in and refreshes activity just under the 10 minute mark', async () => {
      findActive.mockResolvedValue(
        record({ role: Role.ADMIN, lastUsedAt: new Date(Date.now() - 9 * 60_000) }),
      );
      const user = await authenticator.authenticate(
        requestWith({ [ACCESS_COOKIE_NAME]: accessCookie() }),
        response,
      );
      expect(user).not.toBeNull();
      expect(touchLastUsedAt).toHaveBeenCalledWith(SESSION_ID);
      expect(revoke).not.toHaveBeenCalled();
    });
  });

  describe('admin session cookie', () => {
    const cookies = (adminToken?: string) => ({
      [ACCESS_COOKIE_NAME]: accessCookie(),
      ...(adminToken && { [ADMIN_SESSION_COOKIE_NAME]: adminToken }),
    });
    const adminToken = (overrides: { sub?: string; sid?: string; sat?: number } = {}) =>
      tokens.signAdminSessionToken({
        sub: USER_ID,
        sid: SESSION_ID,
        sat: Date.now(),
        ...overrides,
      });

    it('is active for a fresh token of the same user and session', async () => {
      const user = await authenticator.authenticate(requestWith(cookies(adminToken())), response);
      expect(user?.adminSessionActive).toBe(true);
      expect(setAdminCookie).not.toHaveBeenCalled();
    });

    it('is inactive without the cookie', async () => {
      expect(
        (await authenticator.authenticate(requestWith(cookies()), response))?.adminSessionActive,
      ).toBe(false);
    });

    it('is inactive for a token of another user', async () => {
      const token = adminToken({ sub: '44444444-4444-4444-8444-444444444444' });
      expect(
        (await authenticator.authenticate(requestWith(cookies(token)), response))
          ?.adminSessionActive,
      ).toBe(false);
    });

    it('is inactive for a token of another session', async () => {
      const token = adminToken({ sid: '55555555-5555-4555-8555-555555555555' });
      expect(
        (await authenticator.authenticate(requestWith(cookies(token)), response))
          ?.adminSessionActive,
      ).toBe(false);
    });

    it('is inactive for a forged token', async () => {
      const forged = new TokenService(new JwtService(), {
        ...config,
        adminSessionSecret: 'x'.repeat(40),
      }).signAdminSessionToken({ sub: USER_ID, sid: SESSION_ID, sat: Date.now() });
      expect(
        (await authenticator.authenticate(requestWith(cookies(forged)), response))
          ?.adminSessionActive,
      ).toBe(false);
    });

    it('is never active for customers', async () => {
      findActive.mockResolvedValue(record({ role: Role.CUSTOMER }));
      expect(
        (await authenticator.authenticate(requestWith(cookies(adminToken())), response))
          ?.adminSessionActive,
      ).toBe(false);
    });

    it('is inactive past the eight hour absolute cap', async () => {
      const token = adminToken({ sat: Date.now() - 8 * 60 * 60 * 1000 - 1000 });
      expect(
        (await authenticator.authenticate(requestWith(cookies(token)), response))
          ?.adminSessionActive,
      ).toBe(false);
    });

    it('is inactive when the session ended the elevation after it started', async () => {
      const sat = Date.now() - 60_000;
      findActive.mockResolvedValue(record({ adminSessionEndedAt: new Date(sat + 1000) }));
      expect(
        (await authenticator.authenticate(requestWith(cookies(adminToken({ sat }))), response))
          ?.adminSessionActive,
      ).toBe(false);
    });

    it('stays active when a newer elevation follows an ended one', async () => {
      const sat = Date.now();
      findActive.mockResolvedValue(record({ adminSessionEndedAt: new Date(sat - 60_000) }));
      expect(
        (await authenticator.authenticate(requestWith(cookies(adminToken({ sat }))), response))
          ?.adminSessionActive,
      ).toBe(true);
    });

    it('slides: re-issues the cookie once more than half the idle time is used, keeping the original start', async () => {
      jest.useFakeTimers({ now: Date.now() });
      try {
        const sat = Date.now();
        const token = adminToken({ sat });
        jest.setSystemTime(Date.now() + 16 * 60_000);
        // Unrelated to the elevated-session slide under test: keep the login session itself fresh
        findActive.mockResolvedValue(record({ lastUsedAt: new Date() }));
        const user = await authenticator.authenticate(requestWith(cookies(token)), response);
        expect(user?.adminSessionActive).toBe(true);
        expect(setAdminCookie).toHaveBeenCalledTimes(1);
        const reissued = tokens.verifyAdminSessionToken(setAdminCookie.mock.calls[0][1] as string);
        expect(reissued?.sat).toBe(sat);
        expect(reissued?.sid).toBe(SESSION_ID);
      } finally {
        jest.useRealTimers();
      }
    });

    it('adminSessionState reports the earlier of idle expiry and absolute cap', () => {
      const sat = Date.now();
      const token = adminToken({ sat });
      const state = authenticator.adminSessionState(requestWith(cookies(token)), {
        id: USER_ID,
        role: Role.ADMIN,
        sessionId: SESSION_ID,
        adminSessionActive: true,
        mustChangePassword: false,
      });
      expect(state.active).toBe(true);
      expect(state.expiresAt!.getTime()).toBeLessThanOrEqual(sat + 30 * 60_000 + 1000);
    });
  });
});
