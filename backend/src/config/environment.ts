import * as Joi from 'joi';

export interface Environment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  API_GLOBAL_PREFIX: string;
  CORS_ORIGINS: string[];
  COOKIE_SECURE: boolean;
  COOKIE_DOMAIN: string;
  TRUST_PROXY: string;

  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  DATABASE_TEST_NAME: string;
  DATABASE_LOGGING: boolean;
  DATABASE_SCHEMA: string;

  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_MINUTES: number;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_TTL_DAYS: number;
  JWT_ADMIN_SESSION_SECRET: string;
  ADMIN_SESSION_TTL_MINUTES: number;
  PASSWORD_RESET_CODE_TTL_MINUTES: number;
  LOGIN_MAX_FAILED_ATTEMPTS: number;
  LOGIN_LOCK_MINUTES: number;

  MAIL_DRIVER: 'log' | 'smtp';
  MAIL_FROM: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;

  STORAGE_DRIVER: 'local';
  UPLOAD_DIR: string;
  PUBLIC_MEDIA_BASE_URL: string;
  MEDIA_MAX_FILE_SIZE_MB: number;

  BOOTSTRAP_OWNER_EMAIL: string;
  BOOTSTRAP_OWNER_PHONE: string;
  BOOTSTRAP_OWNER_FULL_NAME: string;
  BOOTSTRAP_OWNER_PASSWORD: string;
}

const positiveInteger = Joi.number().integer().positive();
const optionalText = Joi.string().allow('').default('');
const secret = Joi.string().min(32).required();

const corsOrigins = Joi.string()
  .required()
  .custom((value: string, helpers) => {
    const origins: string[] = [];
    for (const item of value.split(',')) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      try {
        origins.push(new URL(trimmed).origin);
      } catch {
        return helpers.error('any.invalid');
      }
    }
    return origins.length > 0 ? origins : helpers.error('any.invalid');
  }, 'comma separated origin list');

export const environmentSchema = Joi.object<Environment>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),
  API_GLOBAL_PREFIX: Joi.string()
    .pattern(/^[a-z0-9_-]+(\/[a-z0-9_-]+)*$/i)
    .default('api/v1'),
  CORS_ORIGINS: corsOrigins,
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_DOMAIN: optionalText,
  TRUST_PROXY: Joi.string().default('false'),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_TEST_NAME: Joi.string().required(),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_SCHEMA: Joi.string()
    .pattern(/^[a-z_][a-z0-9_]*$/)
    .default('public'),

  JWT_ACCESS_SECRET: secret,
  JWT_ACCESS_TTL_MINUTES: positiveInteger.default(15),
  JWT_REFRESH_SECRET: secret,
  JWT_REFRESH_TTL_DAYS: positiveInteger.default(30),
  JWT_ADMIN_SESSION_SECRET: secret,
  ADMIN_SESSION_TTL_MINUTES: positiveInteger.default(30),
  PASSWORD_RESET_CODE_TTL_MINUTES: positiveInteger.default(15),
  LOGIN_MAX_FAILED_ATTEMPTS: positiveInteger.default(5),
  LOGIN_LOCK_MINUTES: positiveInteger.default(15),

  MAIL_DRIVER: Joi.string().valid('log', 'smtp').default('log'),
  MAIL_FROM: Joi.string().required(),
  SMTP_HOST: Joi.string()
    .allow('')
    .default('')
    .when('MAIL_DRIVER', { is: 'smtp', then: Joi.string().required() }),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,

  STORAGE_DRIVER: Joi.string().valid('local').default('local'),
  UPLOAD_DIR: Joi.string().default('./uploads'),
  PUBLIC_MEDIA_BASE_URL: Joi.string().uri().required(),
  MEDIA_MAX_FILE_SIZE_MB: positiveInteger.max(200).default(10),

  BOOTSTRAP_OWNER_EMAIL: optionalText,
  BOOTSTRAP_OWNER_PHONE: optionalText,
  BOOTSTRAP_OWNER_FULL_NAME: optionalText,
  BOOTSTRAP_OWNER_PASSWORD: optionalText,
})
  .custom((value: Environment, helpers) => {
    const secrets = [
      value.JWT_ACCESS_SECRET,
      value.JWT_REFRESH_SECRET,
      value.JWT_ADMIN_SESSION_SECRET,
    ];
    if (new Set(secrets).size !== secrets.length) {
      return helpers.message({ custom: 'JWT secrets must all be different from each other' });
    }
    if (value.NODE_ENV === 'production' && !value.COOKIE_SECURE) {
      return helpers.message({ custom: 'COOKIE_SECURE must be true in production' });
    }
    return value;
  })
  .unknown(true);

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const { error, value } = environmentSchema.validate(source, {
    abortEarly: false,
    convert: true,
    errors: { wrap: { label: false } },
  });
  if (error) {
    const lines = error.details.map((detail) => `  - ${detail.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${lines}`);
  }
  return value as Environment;
}

export function validateEnvironment(raw: Record<string, unknown>): Record<string, unknown> {
  loadEnvironment(raw as NodeJS.ProcessEnv);
  return raw;
}
