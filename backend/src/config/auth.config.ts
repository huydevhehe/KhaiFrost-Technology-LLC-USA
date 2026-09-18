import { ConfigType, registerAs } from '@nestjs/config';
import { loadEnvironment } from './environment';

export const authConfig = registerAs('auth', () => {
  const env = loadEnvironment();
  return {
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtlMinutes: env.JWT_ACCESS_TTL_MINUTES,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshTtlDays: env.JWT_REFRESH_TTL_DAYS,
    adminSessionSecret: env.JWT_ADMIN_SESSION_SECRET,
    adminSessionTtlMinutes: env.ADMIN_SESSION_TTL_MINUTES,
    passwordResetCodeTtlMinutes: env.PASSWORD_RESET_CODE_TTL_MINUTES,
    loginMaxFailedAttempts: env.LOGIN_MAX_FAILED_ATTEMPTS,
    loginLockMinutes: env.LOGIN_LOCK_MINUTES,
  };
});

export type AuthConfig = ConfigType<typeof authConfig>;
