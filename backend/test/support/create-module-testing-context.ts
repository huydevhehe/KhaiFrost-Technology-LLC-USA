import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Provider, Type, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, DataSourceOptions } from 'typeorm';
import { configureApplication } from '../../src/bootstrap/configure-app';
import { CommonModule } from '../../src/common/common.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { validationExceptionFactory } from '../../src/common/filters/validation-exception.factory';
import { ResponseEnvelopeInterceptor } from '../../src/common/interceptors/response-envelope.interceptor';
import {
  appConfig,
  authConfig,
  BACKEND_ROOT,
  bootstrapOwnerConfig,
  databaseConfig,
  loadDotenv,
  loadEnvironment,
  mailConfig,
  storageConfig,
  validateEnvironment,
} from '../../src/config';
import { buildDataSourceOptions } from '../../src/database/database-options';
import { AuditColumnsSubscriber } from '../../src/database/subscribers/audit-columns.subscriber';
import { TestAuthenticationGuard } from './test-authentication.guard';

// The only database tests may touch; each run gets its own throw-away schema inside it
const ALLOWED_TEST_DATABASE = 'khaifrost_test';

type EntityClass = Type<unknown>;

export interface ModuleTestingContextOptions {
  // Every entity whose table the test needs, including MediaAsset when something references it
  entities: EntityClass[];
  // The module(s) under test (and any module they import that is NOT already global)
  imports?: Type<unknown>[];
  providers?: Provider[];
  controllers?: Type<unknown>[];
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

export interface ModuleTestingContext {
  app: NestExpressApplication;
  moduleRef: TestingModule;
  dataSource: DataSource;
  schema: string;
  close(): Promise<void>;
}

// Boots ONLY the given modules/entities (never AppModule), so an unfinished module elsewhere cannot break the test.
// Auth is replaced by TestAuthenticationGuard: send `asTestUser({ id, role })` headers with supertest.
export async function createModuleTestingContext(
  options: ModuleTestingContextOptions,
): Promise<ModuleTestingContext> {
  loadDotenv();
  const testDatabase = process.env.DATABASE_TEST_NAME;
  if (testDatabase !== ALLOWED_TEST_DATABASE) {
    throw new Error(`Refusing to run tests: DATABASE_TEST_NAME must be ${ALLOWED_TEST_DATABASE}`);
  }

  const schema = `test_${randomBytes(6).toString('hex')}`;
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_NAME = testDatabase;
  process.env.DATABASE_SCHEMA = schema;
  process.env.UPLOAD_DIR = join(tmpdir(), 'khaifrost-test-uploads', schema);
  process.env.DISABLE_THROTTLING = 'true';
  loadEnvironment();

  const baseOptions = buildDataSourceOptions(databaseConfig());
  const dataSourceOptions = { ...baseOptions, entities: options.entities } as DataSourceOptions;

  await runOnTestDatabase(assertTestSchemaName(schema, 'CREATE SCHEMA'));
  try {
    const schemaBuilder = new DataSource({ ...dataSourceOptions, synchronize: true });
    await schemaBuilder.initialize();
    await schemaBuilder.destroy();

    let builder = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: join(BACKEND_ROOT, '.env'),
          load: [
            appConfig,
            databaseConfig,
            authConfig,
            mailConfig,
            storageConfig,
            bootstrapOwnerConfig,
          ],
          validate: validateEnvironment,
        }),
        CommonModule,
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRoot(dataSourceOptions),
        TypeOrmModule.forFeature(options.entities),
        ...(options.imports ?? []),
      ],
      controllers: options.controllers ?? [],
      providers: [
        AuditColumnsSubscriber,
        { provide: APP_GUARD, useClass: TestAuthenticationGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
        {
          provide: APP_PIPE,
          useValue: new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            exceptionFactory: validationExceptionFactory,
          }),
        },
        ...(options.providers ?? []),
      ],
    });
    if (options.customize) builder = options.customize(builder);

    const moduleRef = await builder.compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApplication(app, { enableSwagger: false });
    await app.init();

    return {
      app,
      moduleRef,
      dataSource: moduleRef.get(DataSource),
      schema,
      close: async () => {
        await app.close();
        await runOnTestDatabase(assertTestSchemaName(schema, 'DROP SCHEMA IF EXISTS'));
      },
    };
  } catch (error) {
    await runOnTestDatabase(assertTestSchemaName(schema, 'DROP SCHEMA IF EXISTS'));
    throw error;
  }
}

// Builds the statement only for names this helper generated, so it can never touch a real schema
function assertTestSchemaName(
  schema: string,
  verb: 'CREATE SCHEMA' | 'DROP SCHEMA IF EXISTS',
): string {
  if (!/^test_[0-9a-f]{12}$/.test(schema)) throw new Error('Refusing to touch a non-test schema');
  return verb === 'CREATE SCHEMA'
    ? `CREATE SCHEMA "${schema}"`
    : `DROP SCHEMA IF EXISTS "${schema}" CASCADE`;
}

async function runOnTestDatabase(statement: string): Promise<void> {
  const database = databaseConfig();
  const client = new Client({
    host: database.host,
    port: database.port,
    user: database.username,
    password: database.password,
    database: ALLOWED_TEST_DATABASE,
  });
  await client.connect();
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
}
