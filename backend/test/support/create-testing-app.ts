import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Type } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/bootstrap/configure-app';
import { databaseConfig, loadDotenv, loadEnvironment } from '../../src/config';
import { buildDataSourceOptions } from '../../src/database/database-options';

// The only database tests may touch; each run gets its own throw-away schema inside it
const ALLOWED_TEST_DATABASE = 'khaifrost_test';

export interface TestingApp {
  app: NestExpressApplication;
  schema: string;
  close(): Promise<void>;
}

export interface CreateTestingAppOptions {
  // Lets a spec swap providers, e.g. the mail sender
  customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
  enableThrottling?: boolean;
  controllers?: Type<unknown>[];
}

export async function createTestingApp(options: CreateTestingAppOptions = {}): Promise<TestingApp> {
  loadDotenv();
  const testDatabase = process.env.DATABASE_TEST_NAME;
  if (testDatabase !== ALLOWED_TEST_DATABASE) {
    throw new Error(`Refusing to run tests: DATABASE_TEST_NAME must be ${ALLOWED_TEST_DATABASE}`);
  }

  const schema = `test_${randomBytes(6).toString('hex')}`;
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_NAME = testDatabase;
  process.env.DATABASE_SCHEMA = schema;
  process.env.UPLOAD_DIR = join(tmpdir(), 'khaifrost-test-uploads');
  process.env.DISABLE_THROTTLING = options.enableThrottling ? 'false' : 'true';
  loadEnvironment();

  const database = databaseConfig();
  await createTestSchema(schema);
  const schemaBuilder = new DataSource(buildDataSourceOptions(database, { synchronize: true }));
  await schemaBuilder.initialize();
  await schemaBuilder.destroy();

  try {
    let builder = Test.createTestingModule({
      imports: [AppModule],
      controllers: options.controllers ?? [],
    });
    if (options.customize) builder = options.customize(builder);
    const moduleRef = await builder.compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApplication(app, { enableSwagger: false });
    await app.init();

    return {
      app,
      schema,
      close: async () => {
        await app.close();
        await dropTestSchema(schema);
      },
    };
  } catch (error) {
    await dropTestSchema(schema);
    throw error;
  }
}

function assertTestSchemaName(schema: string): void {
  if (!/^test_[0-9a-f]{12}$/.test(schema)) throw new Error('Refusing to touch a non-test schema');
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

async function createTestSchema(schema: string): Promise<void> {
  assertTestSchemaName(schema);
  await runOnTestDatabase(`CREATE SCHEMA "${schema}"`);
}

async function dropTestSchema(schema: string): Promise<void> {
  assertTestSchemaName(schema);
  await runOnTestDatabase(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
}
