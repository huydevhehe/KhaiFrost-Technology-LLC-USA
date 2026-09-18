import { ConfigType, registerAs } from '@nestjs/config';
import { loadEnvironment } from './environment';

export const databaseConfig = registerAs('database', () => {
  const env = loadEnvironment();
  return {
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    username: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    name: env.DATABASE_NAME,
    testName: env.DATABASE_TEST_NAME,
    logging: env.DATABASE_LOGGING,
    schema: env.DATABASE_SCHEMA,
  };
});

export type DatabaseConfig = ConfigType<typeof databaseConfig>;
