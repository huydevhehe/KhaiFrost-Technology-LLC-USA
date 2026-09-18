import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { DatabaseConfig } from '../config/database.config';

export function buildDataSourceOptions(
  config: DatabaseConfig,
  overrides: { synchronize?: boolean; databaseName?: string } = {},
): DataSourceOptions {
  const useCustomSchema = config.schema !== 'public';
  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: overrides.databaseName ?? config.name,
    schema: config.schema,
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: overrides.synchronize ?? false,
    migrationsRun: false,
    logging: config.logging ? ['query', 'error', 'warn', 'migration'] : ['error', 'warn'],
    applicationName: 'khaifrost-backend',
    // Keeps unqualified raw SQL inside the isolated test schema
    extra: useCustomSchema ? { options: `-c search_path=${config.schema},public` } : {},
  };
}
