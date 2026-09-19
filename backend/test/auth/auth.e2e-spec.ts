import request from 'supertest';
import { Repository } from 'typeorm';
import {
  ACCESS_COOKIE_NAME,
  ADMIN_SESSION_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../../src/common/constants/cookie-names';
import { Role } from '../../src/common/enums/role.enum';
import { AuditLogEntry } from '../../src/modules/audit-log/entities/audit-log-entry.entity';
import { AuthIdentity } from '../../src/modules/auth/entities/auth-identity.entity';
import { AuthSession } from '../../src/modules/auth/entities/auth-session.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { UserStatus } from '../../src/modules/users/enums/user-status.enum';
import { seedBootstrapOwner } from '../../src/modules/users/seeds/bootstrap-owner.seed';
import { UsersService } from '../../src/modules/users/services/users.service';
import { cookieHeader, cookiesFrom, findCookie, isCleared } from './support/cookies';
import {
  createIdentityTestingContext,
  IdentityTestingContext,
} from './support/create-identity-testing-context';

const PASSWORD = 'Str0ng-Passphrase-1';
let counter = 0;

describe('auth (real access control guard)', () => {
  let context: IdentityTestingContext;
  let sessions: Repository<AuthSession>;
  let users: Repository<User>;
  let audit: Repository<AuditLogEntry>;

  const server = () => context.app.getHttpServer();
  const nextId = () => `${Date.now().toString(36)}${counter++}`;

  beforeAll(async () => {
    context = await createIdentityTestingContext();
    sessions = context.dataSource.getRepository(AuthSession);
    users = context.dataSource.getRepository(User);
    audit = context.dataSource.getRepository(AuditLogEntry);
  });

  afterAll(async () => {
    await context.close();
  });

  function newIdentity() {
    const id = nextId();
    return {
      fullName: `Person ${id}`,
      email: `person.${id}@example.com`,
      phone: `09${String(10000000 + counter * 7).slice(0, 8)}`,
      password: PASSWORD,
    };
  }

  async function register(overrides: Partial<ReturnType<typeof newIdentity>> = {}) {
    const identity = { ...newIdentity(), ...overrides };
    const response = await request(server()).post('/api/v1/auth/register').send(identity);
    return { identity, response, jar: cookiesFrom(response) };
  }

  async function createBackOfficeUser(role: Role) {
    const identity = newIdentity();
    const user = await context.app.get(UsersService).create({ ...identity, role });
    return { identity, user };
  }

  async function login(identifier: string, password = PASSWORD, rememberMe?: boolean) {
    const response = await request(server())
      .post('/api/v1/auth/login')
      .send({ identifier, password, rememberMe });
    return { response, jar: cookiesFrom(response) };
  }

  const authed = (jar: Record<string, string>) => cookieHeader(jar);

  async function elevate(jar: Record<string, string>, password = PASSWORD) {
    const response = await request(server())
      .post('/api/v1/auth/admin-session')
      .set('Cookie', authed(jar))
      .send({ password });
    return { response, jar: { ...jar, ...cookiesFrom(response) } };
  }

  async function auditActions(): Promise<string[]> {
    return (await audit.find()).map((entry) => entry.action);
  }

  describe('register', () => {
    it('creates a customer, signs in with httpOnly cookies and never returns secrets', async () => {
      const { identity, response } = await register();
      expect(response.status).toBe(201);
      expect(response.body.data.user).toMatchObject({
        fullName: identity.fullName,
        email: identity.email,
        role: 'customer',
        permissions: [],
        adminSessionActive: false,
        mustChangePassword: false,
      });
      expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|refreshToken|accessToken/i);

      const access = findCookie(response, ACCESS_COOKIE_NAME)!;
      const refresh = findCookie(response, REFRESH_COOKIE_NAME)!;
      for (const cookie of [access, refresh]) {
        expect(cookie.attributes).toContain('HttpOnly');
        expect(cookie.attributes).toContain('SameSite=Lax');
      }
      expect(access.attributes).toContain('Path=/');
      expect(refresh.attributes).toContain('Path=/api/v1/auth');
      // Not remembered: a browser-session cookie
      expect(refresh.attributes.some((attribute) => /^(Max-Age|Expires)=/i.test(attribute))).toBe(
        false,
      );
    });

    it('stores E.164 phone, lower-cased email, an argon2id hash and a password identity', async () => {
      const email = `MiXed.${nextId()}@Example.COM`;
      const { response } = await register({ email, phone: '0912 345 678' });
      expect(response.status).toBe(201);
      const stored = await users
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.id = :id', { id: response.body.data.user.id })
        .getOneOrFail();
      expect(stored.email).toBe(email.toLowerCase());
      expect(stored.phone).toBe('+84912345678');
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
      const identity = await context.dataSource
        .getRepository(AuthIdentity)
        .findOneByOrFail({ userId: stored.id });
      expect(identity.provider).toBe('password');
    });

    it('sends the welcome mail through the transport', async () => {
      const { identity } = await register();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(context.mail.sent.some((mail) => mail.to === identity.email.toLowerCase())).toBe(true);
    });

    it('reports only the clashing field on conflict', async () => {
      const first = await register();
      const emailClash = await request(server())
        .post('/api/v1/auth/register')
        .send({ ...newIdentity(), email: first.identity.email });
      expect(emailClash.status).toBe(409);
      expect(emailClash.body.error.code).toBe('CONFLICT');
      expect(
        emailClash.body.error.details.map((detail: { field: string }) => detail.field),
      ).toEqual(['email']);

      const phoneClash = await request(server())
        .post('/api/v1/auth/register')
        .send({ ...newIdentity(), phone: first.identity.phone });
      expect(phoneClash.status).toBe(409);
      expect(
        phoneClash.body.error.details.map((detail: { field: string }) => detail.field),
      ).toEqual(['phone']);
    });

    it.each([
      ['password too short', { password: 'Ab1' }],
      ['password without uppercase', { password: 'alllowercase123' }],
      ['common password', { password: 'Password1234' }],
      ['bad email', { email: 'not-an-email' }],
      ['bad phone', { phone: '12' }],
      ['missing name', { fullName: '' }],
    ])('rejects %s', async (_label, override) => {
      const response = await request(server())
        .post('/api/v1/auth/register')
        .send({ ...newIdentity(), ...override });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects a password equal to the email name and unknown properties', async () => {
      const response = await request(server())
        .post('/api/v1/auth/register')
        .send({ ...newIdentity(), email: 'Sameaddress1@example.com', password: 'Sameaddress1' });
      expect(response.status).toBe(400);
      const withRole = await request(server())
        .post('/api/v1/auth/register')
        .send({ ...newIdentity(), role: 'owner' });
      expect(withRole.status).toBe(400);
    });

    it('cannot be used to create a staff account', async () => {
      const { response } = await register();
      expect(response.body.data.user.role).toBe('customer');
    });
  });

  describe('login', () => {
    it('signs in with email (any case) or phone in several notations', async () => {
      const { identity } = await register();
      expect((await login(identity.email.toUpperCase())).response.status).toBe(200);
      expect((await login(identity.phone)).response.status).toBe(200);
      const international = `+84${identity.phone.slice(1)}`;
      expect((await login(international)).response.status).toBe(200);
    });

    it('gives the same generic answer for a wrong password and an unknown account', async () => {
      const { identity } = await register();
      const wrong = await login(identity.email, 'Wrong-Passphrase-9');
      const unknown = await login('nobody@example.com', 'Wrong-Passphrase-9');
      const malformed = await login('###', 'Wrong-Passphrase-9');
      for (const attempt of [wrong, unknown, malformed]) {
        expect(attempt.response.status).toBe(401);
        expect(attempt.response.body.error.code).toBe('INVALID_CREDENTIALS');
        expect(attempt.response.body.error.message).toBe(wrong.response.body.error.message);
        expect(attempt.response.headers['set-cookie']).toBeUndefined();
      }
    });

    it('validates the payload shape', async () => {
      const response = await request(server()).post('/api/v1/auth/login').send({ identifier: 'a' });
      expect(response.status).toBe(400);
    });

    it('makes the refresh cookie persistent only with rememberMe and sets server expiry accordingly', async () => {
      const { identity } = await register();
      const short = await login(identity.email, PASSWORD, false);
      const long = await login(identity.email, PASSWORD, true);
      const shortCookie = findCookie(short.response, REFRESH_COOKIE_NAME)!;
      const longCookie = findCookie(long.response, REFRESH_COOKIE_NAME)!;
      expect(shortCookie.attributes.some((attribute) => /^Max-Age=/i.test(attribute))).toBe(false);
      const maxAge = longCookie.attributes.find((attribute) => /^Max-Age=/i.test(attribute))!;
      expect(Number(maxAge.split('=')[1])).toBe(30 * 24 * 3600);

      const shortSession = await sessions.findOneByOrFail({ id: shortCookie.value.split('.')[0] });
      const longSession = await sessions.findOneByOrFail({ id: longCookie.value.split('.')[0] });
      const hours = (session: AuthSession) =>
        (session.expiresAt.getTime() - Date.now()) / 3_600_000;
      expect(hours(shortSession)).toBeGreaterThan(23);
      expect(hours(shortSession)).toBeLessThanOrEqual(24);
      expect(hours(longSession)).toBeGreaterThan(29 * 24);
      expect(shortSession.rememberMe).toBe(false);
      expect(longSession.rememberMe).toBe(true);
    });

    it('stores only a hash of the refresh token', async () => {
      const { identity } = await register();
      const { jar } = await login(identity.email);
      const session = await sessions.findOneByOrFail({
        id: jar[REFRESH_COOKIE_NAME].split('.')[0],
      });
      expect(session.refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(jar[REFRESH_COOKIE_NAME]).not.toContain(session.refreshTokenHash);
    });

    it('locks the account after too many failures, even for the right password, then recovers', async () => {
      const { identity } = await register();
      for (let attempt = 0; attempt < 3; attempt++) {
        expect((await login(identity.email, 'Wrong-Passphrase-9')).response.status).toBe(401);
      }
      const locked = await login(identity.email, PASSWORD);
      expect(locked.response.status).toBe(403);
      expect(locked.response.body.error.code).toBe('ACCOUNT_LOCKED');

      const stored = await users.findOneByOrFail({ email: identity.email.toLowerCase() });
      expect(stored.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
      expect(await auditActions()).toContain('auth.account.locked');

      await users.update({ id: stored.id }, { lockedUntil: new Date(Date.now() - 1000) });
      expect((await login(identity.email, PASSWORD)).response.status).toBe(200);
      const after = await users.findOneByOrFail({ id: stored.id });
      expect(after.failedLoginAttempts).toBe(0);
      expect(after.lockedUntil).toBeNull();
    });

    it('resets the failure counter after a successful login', async () => {
      const { identity } = await register();
      await login(identity.email, 'Wrong-Passphrase-9');
      await login(identity.email, 'Wrong-Passphrase-9');
      expect((await login(identity.email)).response.status).toBe(200);
      await login(identity.email, 'Wrong-Passphrase-9');
      await login(identity.email, 'Wrong-Passphrase-9');
      expect((await login(identity.email)).response.status).toBe(200);
    });

    it('blocks administrator-locked accounts only for someone who knows the password', async () => {
      const { identity } = await register();
      await users.update({ email: identity.email.toLowerCase() }, { status: UserStatus.LOCKED });
      const wrong = await login(identity.email, 'Wrong-Passphrase-9');
      expect(wrong.response.body.error.code).toBe('INVALID_CREDENTIALS');
      const right = await login(identity.email);
      expect(right.response.status).toBe(403);
      expect(right.response.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    it('records successes and failures in the audit trail without secrets', async () => {
      const { identity } = await register();
      await login(identity.email, 'Wrong-Passphrase-9');
      await login(identity.email);
      const entries = await audit.find();
      const failed = entries.find(
        (entry) =>
          entry.action === 'auth.login.failed' && entry.metadata.reason === 'wrong_password',
      );
      expect(failed).toBeDefined();
      expect(entries.some((entry) => entry.action === 'auth.login.succeeded')).toBe(true);
      expect(JSON.stringify(entries)).not.toContain(PASSWORD);
      expect(JSON.stringify(entries)).not.toContain(identity.email);
    });
  });

  describe('me and access control', () => {
    it('requires authentication', async () => {
      await request(server()).get('/api/v1/auth/me').expect(401);
      await request(server())
        .get('/api/v1/auth/me')
        .set('Cookie', `${ACCESS_COOKIE_NAME}=garbage`)
        .expect(401);
    });

    it('returns role, permissions and admin state', async () => {
      const staff = await createBackOfficeUser(Role.STAFF);
      const { jar } = await login(staff.identity.email);
      const me = await request(server())
        .get('/api/v1/auth/me')
        .set('Cookie', authed(jar))
        .expect(200);
      expect(me.body.data).toMatchObject({ role: 'staff', adminSessionActive: false });
      expect(me.body.data.permissions).toContain('post:create');
      expect(me.body.data.permissions).not.toContain('user:read');
    });

    it('stops working immediately when the user is locked or deleted', async () => {
      const first = await register();
      const second = await register();
      await users.update({ id: first.response.body.data.user.id }, { status: UserStatus.LOCKED });
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(first.jar)).expect(401);
      await users.softDelete({ id: second.response.body.data.user.id });
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(second.jar)).expect(401);
    });

    it('rejects an access token whose session was revoked', async () => {
      const { jar } = await register();
      await sessions.update(
        { id: jar[REFRESH_COOKIE_NAME].split('.')[0] },
        { revokedAt: new Date() },
      );
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(jar)).expect(401);
    });

    it('keeps refresh-only requests from authenticating', async () => {
      const { jar } = await register();
      await request(server())
        .get('/api/v1/auth/me')
        .set('Cookie', cookieHeader({ [REFRESH_COOKIE_NAME]: jar[REFRESH_COOKIE_NAME] }))
        .expect(401);
    });
  });

  describe('refresh rotation and reuse detection', () => {
    const refresh = (jar: Record<string, string>) =>
      request(server())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieHeader({ [REFRESH_COOKIE_NAME]: jar[REFRESH_COOKIE_NAME] }));

    it('rotates the refresh token and issues a working access token', async () => {
      const { jar } = await register();
      const response = await refresh(jar).expect(200);
      const rotated = cookiesFrom(response);
      expect(rotated[REFRESH_COOKIE_NAME]).toBeDefined();
      expect(rotated[REFRESH_COOKIE_NAME]).not.toBe(jar[REFRESH_COOKIE_NAME]);
      expect(rotated[REFRESH_COOKIE_NAME].split('.')[0]).toBe(
        jar[REFRESH_COOKIE_NAME].split('.')[0],
      );
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(rotated)).expect(200);
      await refresh(rotated).expect(200);
    });

    it('rejects a missing, malformed or unknown refresh token and clears the cookies', async () => {
      const none = await request(server()).post('/api/v1/auth/refresh').expect(401);
      expect(isCleared(findCookie(none, REFRESH_COOKIE_NAME))).toBe(true);
      await refresh({ [REFRESH_COOKIE_NAME]: 'garbage' }).expect(401);
      const forged = `${'a'.repeat(8)}-aaaa-4aaa-8aaa-${'a'.repeat(12)}.${'A'.repeat(43)}`;
      await refresh({ [REFRESH_COOKIE_NAME]: forged }).expect(401);
    });

    it('treats an immediate replay as a race: 401 without killing the session', async () => {
      const { jar } = await register();
      const rotated = cookiesFrom(await refresh(jar).expect(200));
      const replay = await refresh(jar);
      expect(replay.status).toBe(401);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(rotated)).expect(200);
      await refresh(rotated).expect(200);
    });

    it('revokes the whole session family and audits when a rotated token is replayed later', async () => {
      const { jar } = await register();
      const sessionId = jar[REFRESH_COOKIE_NAME].split('.')[0];
      const rotated = cookiesFrom(await refresh(jar).expect(200));
      await sessions.update({ id: sessionId }, { rotatedAt: new Date(Date.now() - 60_000) });

      await refresh(jar).expect(401);
      const stored = await sessions.findOneByOrFail({ id: sessionId });
      expect(stored.revokedAt).not.toBeNull();
      expect(stored.revokedReason).toBe('refresh-reuse');
      await refresh(rotated).expect(401);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(rotated)).expect(401);
      expect(await auditActions()).toContain('auth.refresh.reuse-detected');
    });

    it('refuses to refresh an expired session', async () => {
      const { jar } = await register();
      await sessions.update(
        { id: jar[REFRESH_COOKIE_NAME].split('.')[0] },
        { expiresAt: new Date(Date.now() - 1000) },
      );
      await refresh(jar).expect(401);
    });

    it('refuses to refresh for a locked user and revokes the session', async () => {
      const { jar, response } = await register();
      await users.update({ id: response.body.data.user.id }, { status: UserStatus.LOCKED });
      await refresh(jar).expect(401);
    });
  });

  describe('logout and sessions', () => {
    it('logout revokes the session, clears cookies and is idempotent', async () => {
      const { jar } = await register();
      const response = await request(server())
        .post('/api/v1/auth/logout')
        .set('Cookie', authed(jar))
        .expect(204);
      expect(isCleared(findCookie(response, ACCESS_COOKIE_NAME))).toBe(true);
      expect(isCleared(findCookie(response, REFRESH_COOKIE_NAME))).toBe(true);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(jar)).expect(401);
      await request(server()).post('/api/v1/auth/logout').set('Cookie', authed(jar)).expect(204);
      await request(server()).post('/api/v1/auth/logout').expect(204);
    });

    it('logout works with only the refresh cookie (expired access token)', async () => {
      const { jar } = await register();
      await request(server())
        .post('/api/v1/auth/logout')
        .set('Cookie', cookieHeader({ [REFRESH_COOKIE_NAME]: jar[REFRESH_COOKIE_NAME] }))
        .expect(204);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(jar)).expect(401);
    });

    it('lists own sessions, marks the current one and revokes another', async () => {
      const { identity, jar } = await register();
      const other = (await login(identity.email)).jar;
      const list = await request(server())
        .get('/api/v1/auth/sessions')
        .set('Cookie', authed(jar))
        .expect(200);
      expect(list.body.data).toHaveLength(2);
      expect(
        list.body.data.filter((session: { current: boolean }) => session.current),
      ).toHaveLength(1);
      expect(JSON.stringify(list.body)).not.toMatch(/hash/i);

      const otherId = other[REFRESH_COOKIE_NAME].split('.')[0];
      await request(server())
        .delete(`/api/v1/auth/sessions/${otherId}`)
        .set('Cookie', authed(jar))
        .expect(204);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(other)).expect(401);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(jar)).expect(200);
    });

    it('cannot revoke a session that belongs to someone else', async () => {
      const victim = await register();
      const attacker = await register();
      const victimId = victim.jar[REFRESH_COOKIE_NAME].split('.')[0];
      await request(server())
        .delete(`/api/v1/auth/sessions/${victimId}`)
        .set('Cookie', authed(attacker.jar))
        .expect(404);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(victim.jar)).expect(200);
      await request(server())
        .delete('/api/v1/auth/sessions/not-a-uuid')
        .set('Cookie', authed(attacker.jar))
        .expect(400);
    });

    it('logout-all signs out every session', async () => {
      const { identity, jar } = await register();
      const other = (await login(identity.email)).jar;
      await request(server())
        .post('/api/v1/auth/logout-all')
        .set('Cookie', authed(jar))
        .expect(204);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(jar)).expect(401);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(other)).expect(401);
    });
  });

  describe('admin session', () => {
    it('is refused for customers and anonymous callers', async () => {
      const { jar } = await register();
      await request(server())
        .post('/api/v1/auth/admin-session')
        .send({ password: PASSWORD })
        .expect(401);
      await request(server())
        .post('/api/v1/auth/admin-session')
        .set('Cookie', authed(jar))
        .send({ password: PASSWORD })
        .expect(403);
    });

    it('guards admin endpoints: no cookie means ADMIN_SESSION_REQUIRED, then access after re-entering the password', async () => {
      const owner = await createBackOfficeUser(Role.OWNER);
      const { jar } = await login(owner.identity.email);
      const blocked = await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed(jar))
        .expect(403);
      expect(blocked.body.error.code).toBe('ADMIN_SESSION_REQUIRED');

      const wrong = await elevate(jar, 'Wrong-Passphrase-9');
      expect(wrong.response.status).toBe(403);
      expect(wrong.response.body.error.code).toBe('INVALID_PASSWORD');
      expect(findCookie(wrong.response, ADMIN_SESSION_COOKIE_NAME)).toBeUndefined();

      const elevated = await elevate(jar);
      expect(elevated.response.status).toBe(200);
      expect(elevated.response.body.data.active).toBe(true);
      const cookie = findCookie(elevated.response, ADMIN_SESSION_COOKIE_NAME)!;
      expect(cookie.attributes).toContain('HttpOnly');

      await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed(elevated.jar))
        .expect(200);
      const status = await request(server())
        .get('/api/v1/auth/admin-session')
        .set('Cookie', authed(elevated.jar))
        .expect(200);
      expect(status.body.data.active).toBe(true);
      const me = await request(server())
        .get('/api/v1/auth/me')
        .set('Cookie', authed(elevated.jar))
        .expect(200);
      expect(me.body.data.adminSessionActive).toBe(true);
    });

    it('enforces permissions on top of the admin session (staff cannot list users)', async () => {
      const staff = await createBackOfficeUser(Role.STAFF);
      const { jar } = await login(staff.identity.email);
      const elevated = await elevate(jar);
      const response = await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed(elevated.jar));
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('is bound to the login session: another session or user cannot reuse the cookie', async () => {
      const owner = await createBackOfficeUser(Role.OWNER);
      const first = (await elevate((await login(owner.identity.email)).jar)).jar;
      const secondLogin = (await login(owner.identity.email)).jar;
      const stolen = {
        ...secondLogin,
        [ADMIN_SESSION_COOKIE_NAME]: first[ADMIN_SESSION_COOKIE_NAME],
      };
      const response = await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed(stolen));
      expect(response.body.error.code).toBe('ADMIN_SESSION_REQUIRED');

      const otherOwner = await createBackOfficeUser(Role.OWNER);
      const otherJar = (await login(otherOwner.identity.email)).jar;
      const swapped = {
        ...otherJar,
        [ADMIN_SESSION_COOKIE_NAME]: first[ADMIN_SESSION_COOKIE_NAME],
      };
      const swappedResponse = await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed(swapped));
      expect(swappedResponse.body.error.code).toBe('ADMIN_SESSION_REQUIRED');
    });

    it('rejects a forged admin cookie', async () => {
      const owner = await createBackOfficeUser(Role.OWNER);
      const { jar } = await login(owner.identity.email);
      const response = await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed({ ...jar, [ADMIN_SESSION_COOKIE_NAME]: 'forged.token.value' }));
      expect(response.body.error.code).toBe('ADMIN_SESSION_REQUIRED');
    });

    it('DELETE ends the elevation server side, so a saved copy of the cookie is void', async () => {
      const owner = await createBackOfficeUser(Role.OWNER);
      const elevated = await elevate((await login(owner.identity.email)).jar);
      const end = await request(server())
        .delete('/api/v1/auth/admin-session')
        .set('Cookie', authed(elevated.jar))
        .expect(204);
      expect(isCleared(findCookie(end, ADMIN_SESSION_COOKIE_NAME))).toBe(true);
      const copy = await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed(elevated.jar));
      expect(copy.body.error.code).toBe('ADMIN_SESSION_REQUIRED');
      const again = await elevate(elevated.jar);
      expect(again.response.status).toBe(200);
      await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed(again.jar))
        .expect(200);
    });

    it('logout closes the elevated session too', async () => {
      const owner = await createBackOfficeUser(Role.OWNER);
      const elevated = await elevate((await login(owner.identity.email)).jar);
      const out = await request(server())
        .post('/api/v1/auth/logout')
        .set('Cookie', authed(elevated.jar))
        .expect(204);
      expect(isCleared(findCookie(out, ADMIN_SESSION_COOKIE_NAME))).toBe(true);
      await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed(elevated.jar))
        .expect(401);
    });

    it('counts failed elevations toward the lockout and audits them', async () => {
      const staff = await createBackOfficeUser(Role.STAFF);
      const { jar } = await login(staff.identity.email);
      for (let attempt = 0; attempt < 3; attempt++) {
        expect((await elevate(jar, 'Wrong-Passphrase-9')).response.status).toBe(403);
      }
      const locked = await elevate(jar);
      expect(locked.response.status).toBe(403);
      expect(locked.response.body.error.code).toBe('ACCOUNT_LOCKED');
      const actions = await auditActions();
      expect(actions).toContain('auth.admin-session.failed');
      expect(actions).toContain('auth.account.locked');
    });

    it('audits started elevations', async () => {
      const owner = await createBackOfficeUser(Role.OWNER);
      await elevate((await login(owner.identity.email)).jar);
      expect(await auditActions()).toContain('auth.admin-session.started');
    });
  });

  describe('forgot and reset password', () => {
    const forgot = (email: string) =>
      request(server()).post('/api/v1/auth/forgot-password').send({ identifier: email });
    const reset = (email: string, code: string, newPassword = 'New-Passphrase-42') =>
      request(server())
        .post('/api/v1/auth/reset-password')
        .send({ identifier: email, code, newPassword });
    const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

    it('answers 202 identically for known and unknown emails, mailing only the known one', async () => {
      const { identity } = await register();
      const before = context.mail.sent.length;
      const known = await forgot(identity.email);
      const unknown = await forgot(`nobody.${nextId()}@example.com`);
      await settle();
      expect(known.status).toBe(202);
      expect(unknown.status).toBe(202);
      expect(unknown.body).toEqual(known.body);
      const resetMails = context.mail.sent
        .slice(before)
        .filter((mail) => /\b\d{6}\b/.test(mail.text));
      expect(resetMails).toHaveLength(1);
      expect(resetMails[0].to).toBe(identity.email.toLowerCase());
    });

    it('rejects a malformed request body', async () => {
      await request(server())
        .post('/api/v1/auth/forgot-password')
        .send({ identifier: 'not-an-email' })
        .expect(400);
    });

    it('resets the password with the emailed code, revokes every session and burns the code', async () => {
      const { identity, jar } = await register();
      await forgot(identity.email);
      await settle();
      const code = context.mail.lastCodeFor(identity.email.toLowerCase())!;
      expect(code).toMatch(/^\d{6}$/);

      await reset(identity.email, code).expect(204);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(jar)).expect(401);
      expect((await login(identity.email, PASSWORD)).response.status).toBe(401);
      expect((await login(identity.email, 'New-Passphrase-42')).response.status).toBe(200);
      const replay = await reset(identity.email, code);
      expect(replay.status).toBe(400);
      expect(replay.body.error.code).toBe('INVALID_RESET_CODE');
      expect(await auditActions()).toContain('auth.password-reset.completed');
    });

    it('stores only a hash of the code and keeps a single active code per user', async () => {
      const { identity } = await register();
      await forgot(identity.email);
      await settle();
      const firstCode = context.mail.lastCodeFor(identity.email.toLowerCase())!;
      const rows = await context.dataSource.query(
        `SELECT code_hash FROM password_reset_codes pr JOIN users u ON u.id = pr.user_id WHERE u.email = $1`,
        [identity.email.toLowerCase()],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(rows[0].code_hash).not.toContain(firstCode);

      // The cooldown protects against mail bombing: a fast second request keeps the first code
      await forgot(identity.email);
      await settle();
      await context.dataSource.query(
        `UPDATE password_reset_codes SET created_at = now() - interval '5 minutes'`,
      );
      await forgot(identity.email);
      await settle();
      const secondCode = context.mail.lastCodeFor(identity.email.toLowerCase())!;
      const count = await context.dataSource.query(
        `SELECT count(*)::int AS total FROM password_reset_codes pr JOIN users u ON u.id = pr.user_id WHERE u.email = $1`,
        [identity.email.toLowerCase()],
      );
      expect(count[0].total).toBe(1);
      if (secondCode !== firstCode) {
        expect((await reset(identity.email, firstCode)).status).toBe(400);
      }
      await reset(identity.email, secondCode).expect(204);
    });

    it('locks the code after five wrong attempts, even for the right code', async () => {
      const { identity } = await register();
      await forgot(identity.email);
      await settle();
      const code = context.mail.lastCodeFor(identity.email.toLowerCase())!;
      const wrong = code === '000000' ? '000001' : '000000';
      for (let attempt = 0; attempt < 5; attempt++) {
        expect((await reset(identity.email, wrong)).status).toBe(400);
      }
      const late = await reset(identity.email, code);
      expect(late.status).toBe(400);
      expect(late.body.error.code).toBe('INVALID_RESET_CODE');
      expect((await login(identity.email, 'New-Passphrase-42')).response.status).toBe(401);
    });

    it('rejects an expired code and unknown accounts with the same error', async () => {
      const { identity } = await register();
      await forgot(identity.email);
      await settle();
      const code = context.mail.lastCodeFor(identity.email.toLowerCase())!;
      await context.dataSource.query(
        `UPDATE password_reset_codes SET expires_at = now() - interval '1 minute'`,
      );
      const expired = await reset(identity.email, code);
      const unknown = await reset('nobody@example.com', '123456');
      expect(expired.status).toBe(400);
      expect(unknown.body.error).toMatchObject({
        code: 'INVALID_RESET_CODE',
        message: expired.body.error.message,
      });
    });

    it('enforces the password policy on the new password and validates the code format', async () => {
      const { identity } = await register();
      await forgot(identity.email);
      await settle();
      const code = context.mail.lastCodeFor(identity.email.toLowerCase())!;
      expect((await reset(identity.email, code, 'weak')).status).toBe(400);
      expect((await reset(identity.email, '12345')).status).toBe(400);
      expect((await reset(identity.email, code, 'Password1234')).status).toBe(400);
      await reset(identity.email, code).expect(204);
    });

    it('does not mail codes to locked accounts', async () => {
      const { identity } = await register();
      await users.update({ email: identity.email.toLowerCase() }, { status: UserStatus.LOCKED });
      const before = context.mail.sent.length;
      expect((await forgot(identity.email)).status).toBe(202);
      await settle();
      expect(context.mail.sent.length).toBe(before);
    });
  });

  describe('change password', () => {
    const change = (
      jar: Record<string, string>,
      currentPassword: string,
      newPassword = 'Changed-Passphrase-7',
    ) =>
      request(server())
        .post('/api/v1/me/password')
        .set('Cookie', authed(jar))
        .send({ currentPassword, newPassword });

    it('requires authentication', async () => {
      await request(server())
        .post('/api/v1/me/password')
        .send({ currentPassword: PASSWORD, newPassword: 'x' })
        .expect(401);
      await request(server())
        .post('/api/v1/me/password')
        .send({ currentPassword: PASSWORD, newPassword: 'Changed-Passphrase-7' })
        .expect(401);
    });

    it('rejects a wrong current password and audits the attempt', async () => {
      const { jar } = await register();
      const response = await change(jar, 'Wrong-Passphrase-9');
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INVALID_PASSWORD');
      expect(await auditActions()).toContain('auth.password.change-failed');
    });

    it('rejects a policy-violating new password', async () => {
      const { jar } = await register();
      expect((await change(jar, PASSWORD, 'Password1234')).status).toBe(400);
    });

    it('changes the password, keeps this session, revokes the others, clears mustChangePassword', async () => {
      const { identity, jar } = await register();
      const other = (await login(identity.email)).jar;
      await users.update({ email: identity.email.toLowerCase() }, { mustChangePassword: true });

      const response = await change(jar, PASSWORD).expect(204);
      expect(isCleared(findCookie(response, ADMIN_SESSION_COOKIE_NAME))).toBe(true);
      await request(server()).get('/api/v1/auth/me').set('Cookie', authed(other)).expect(401);
      const me = await request(server())
        .get('/api/v1/auth/me')
        .set('Cookie', authed(jar))
        .expect(200);
      expect(me.body.data.mustChangePassword).toBe(false);
      expect((await login(identity.email, PASSWORD)).response.status).toBe(401);
      expect((await login(identity.email, 'Changed-Passphrase-7')).response.status).toBe(200);
      expect(await auditActions()).toContain('auth.password.changed');
    });

    it('voids the elevated admin session of the current login', async () => {
      const owner = await createBackOfficeUser(Role.OWNER);
      const elevated = await elevate((await login(owner.identity.email)).jar);
      await change(elevated.jar, PASSWORD).expect(204);
      const response = await request(server())
        .get('/api/v1/admin/users')
        .set('Cookie', authed(elevated.jar));
      expect(response.body.error.code).toBe('ADMIN_SESSION_REQUIRED');
    });
  });

  describe('bootstrap owner seed', () => {
    const settings = {
      email: 'Founder@Example.com',
      phone: '0909000111',
      fullName: 'Founder',
      password: 'Founder-Passphrase-1',
    };

    it('creates the owner once, is idempotent and the owner can sign in', async () => {
      // Earlier tests created owners, so this runs against the existing state first
      expect(await seedBootstrapOwner(context.dataSource, settings)).toBe('skipped-owner-exists');
      await users.softDelete({ role: Role.OWNER });
      expect(await seedBootstrapOwner(context.dataSource, { ...settings, password: '' })).toBe(
        'skipped-not-configured',
      );
      await expect(
        seedBootstrapOwner(context.dataSource, { ...settings, password: 'Password1234' }),
      ).rejects.toThrow(/not acceptable/);
      expect(await seedBootstrapOwner(context.dataSource, settings)).toBe('created');
      expect(await seedBootstrapOwner(context.dataSource, settings)).toBe('skipped-owner-exists');

      const owner = await users.findOneByOrFail({ email: 'founder@example.com' });
      expect(owner).toMatchObject({
        role: Role.OWNER,
        phone: '+84909000111',
        mustChangePassword: true,
      });
      const result = await login('founder@example.com', settings.password);
      expect(result.response.status).toBe(200);
      expect(result.response.body.data.user.role).toBe('owner');
    });
  });
});
