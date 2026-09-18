import { ConfigType, registerAs } from '@nestjs/config';
import { loadEnvironment } from './environment';

function parseTrustProxy(raw: string): boolean | number | string {
  const value = raw.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false' || value === '') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return raw.trim();
}

export const appConfig = registerAs('app', () => {
  const env = loadEnvironment();
  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    port: env.PORT,
    globalPrefix: env.API_GLOBAL_PREFIX,
    corsOrigins: env.CORS_ORIGINS,
    cookieSecure: env.COOKIE_SECURE,
    cookieDomain: env.COOKIE_DOMAIN || undefined,
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    swaggerEnabled: env.NODE_ENV !== 'production',
  };
});

export type AppConfig = ConfigType<typeof appConfig>;
