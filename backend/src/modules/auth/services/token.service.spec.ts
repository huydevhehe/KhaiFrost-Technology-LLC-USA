import { JwtService } from '@nestjs/jwt';
import { Role } from '../../../common/enums/role.enum';
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

const SESSION_ID = '22222222-2222-4222-8222-222222222222';

describe('TokenService', () => {
  const tokens = new TokenService(new JwtService(), config);

  it('round-trips access claims and expires them', () => {
    const token = tokens.signAccessToken({ sub: 'u1', sid: SESSION_ID, role: Role.STAFF });
    expect(tokens.verifyAccessToken(token)).toEqual({
      sub: 'u1',
      sid: SESSION_ID,
      role: Role.STAFF,
    });

    jest.useFakeTimers({ now: Date.now() + 16 * 60_000 });
    try {
      expect(tokens.verifyAccessToken(token)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects unsigned (alg none) and tampered tokens', () => {
    const token = tokens.signAccessToken({ sub: 'u1', sid: SESSION_ID, role: Role.OWNER });
    const [header, payload] = token.split('.');
    const unsigned = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${payload}.`;
    expect(tokens.verifyAccessToken(unsigned)).toBeNull();
    expect(tokens.verifyAccessToken(`${header}.${payload}.AAAA`)).toBeNull();
  });

  it('keeps the two token kinds apart even with the same secret', () => {
    const same = new TokenService(new JwtService(), {
      ...config,
      adminSessionSecret: config.accessSecret,
    });
    const admin = same.signAdminSessionToken({ sub: 'u1', sid: SESSION_ID, sat: Date.now() });
    expect(same.verifyAccessToken(admin)).toBeNull();
    const access = same.signAccessToken({ sub: 'u1', sid: SESSION_ID, role: Role.ADMIN });
    expect(same.verifyAdminSessionToken(access)).toBeNull();
  });

  it('generates 256-bit refresh tokens that only store a keyed hash', () => {
    const { token, hash } = tokens.generateRefreshToken(SESSION_ID);
    const parsed = tokens.parseRefreshToken(token);
    expect(parsed?.sessionId).toBe(SESSION_ID);
    expect(Buffer.from(parsed!.secret, 'base64url')).toHaveLength(32);
    expect(hash).toBe(tokens.hashRefreshSecret(parsed!.secret));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(token).not.toContain(hash);
    expect(tokens.generateRefreshToken(SESSION_ID).token).not.toBe(token);
  });

  it('hashes with the server key', () => {
    const other = new TokenService(new JwtService(), { ...config, refreshSecret: 'q'.repeat(40) });
    expect(other.hashRefreshSecret('abc')).not.toBe(tokens.hashRefreshSecret('abc'));
  });

  it.each([
    undefined,
    42,
    '',
    'no-dot',
    'a.b.c',
    `${SESSION_ID}.short`,
    `not-a-uuid.${'x'.repeat(43)}`,
  ])('refuses to parse malformed refresh token %p', (raw) => {
    expect(tokens.parseRefreshToken(raw)).toBeNull();
  });

  it('binds reset code hashes to the user', () => {
    expect(tokens.hashResetCode('u1', '123456')).not.toBe(tokens.hashResetCode('u2', '123456'));
    expect(tokens.hashResetCode('u1', '123456')).toBe(tokens.hashResetCode('u1', '123456'));
  });

  it('compares in constant time and handles different lengths', () => {
    expect(tokens.safeEqual('abc', 'abc')).toBe(true);
    expect(tokens.safeEqual('abc', 'abd')).toBe(false);
    expect(tokens.safeEqual('abc', 'abcd')).toBe(false);
  });
});
