import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from 'pg';
import { DataSource, DataSourceOptions } from 'typeorm';
import { configureApplication } from '../../../src/bootstrap/configure-app';
import { CommonModule } from '../../../src/common/common.module';
import { AllExceptionsFilter } from '../../../src/common/filters/all-exceptions.filter';
import { validationExceptionFactory } from '../../../src/common/filters/validation-exception.factory';
import { ResponseEnvelopeInterceptor } from '../../../src/common/interceptors/response-envelope.interceptor';
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
} from '../../../src/config';
import { buildDataSourceOptions } from '../../../src/database/database-options';
import { AuditColumnsSubscriber } from '../../../src/database/subscribers/audit-columns.subscriber';
import { AuditLogEntry } from '../../../src/modules/audit-log/entities/audit-log-entry.entity';
import { AuditLogModule } from '../../../src/modules/audit-log/audit-log.module';
import { AuthIdentity } from '../../../src/modules/auth/entities/auth-identity.entity';
import { AuthSession } from '../../../src/modules/auth/entities/auth-session.entity';
import { PasswordResetCode } from '../../../src/modules/auth/entities/password-reset-code.entity';
import { AuthModule } from '../../../src/modules/auth/auth.module';
import { CustomersModule } from '../../../src/modules/customers/customers.module';
import {
  MAIL_TRANSPORT,
  MailTransport,
  OutgoingMail,
} from '../../../src/modules/mail/interfaces/mail-transport.interface';
import { MailModule } from '../../../src/modules/mail/mail.module';
import { MediaAsset } from '../../../src/modules/media/entities/media-asset.entity';
import { User } from '../../../src/modules/users/entities/user.entity';
import { UsersModule } from '../../../src/modules/users/users.module';

// The only database tests may touch; each run gets its own throw-away schema inside it
const ALLOWED_TEST_DATABASE = 'khaifrost_test';

export class FakeMailTransport implements MailTransport {
  readonly sent: OutgoingMail[] = [];

  send(mail: OutgoingMail): Promise<void> {
    this.sent.push(mail);
    return Promise.resolve();
  }

  lastCodeFor(email: string): string | undefined {
    const mail = [...this.sent]
      .reverse()
      .find((item) => item.to === email && /\b\d{6}\b/.test(item.text));
    return mail?.text.match(/\b(\d{6})\b/)?.[1];
  }
}

export interface IdentityTestingContext {
  app: NestExpressApplication;
  dataSource: DataSource;
  mail: FakeMailTransport;
  close(): Promise<void>;
}

const ENTITIES = [MediaAsset, User, AuthIdentity, AuthSession, PasswordResetCode, AuditLogEntry];

// Like createModuleTestingContext but keeps the REAL AccessControlGuard (AuthModule registers it)
export async function createIdentityTestingContext(
  environment: Record<string, string> = {},
): Promise<IdentityTestingContext> {
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
  process.env.LOGIN_MAX_FAILED_ATTEMPTS = '3';
  process.env.LOGIN_LOCK_MINUTES = '15';
  process.env.ADMIN_SESSION_TTL_MINUTES = '30';
  process.env.MAIL_DRIVER = 'log';
  Object.assign(process.env, environment);
  loadEnvironment();

  const dataSourceOptions = {
    ...buildDataSourceOptions(databaseConfig()),
    entities: ENTITIES,
  } as DataSourceOptions;

  await runOnTestDatabase(schemaStatement(schema, 'CREATE SCHEMA'));
  try {
    const schemaBuilder = new DataSource({ ...dataSourceOptions, synchronize: true });
    await schemaBuilder.initialize();
    await schemaBuilder.destroy();

    const mail = new FakeMailTransport();
    const moduleRef = await Test.createTestingModule({
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
        TypeOrmModule.forFeature(ENTITIES),
        AuthModule,
        UsersModule,
        CustomersModule,
        AuditLogModule,
        MailModule,
      ],
      providers: [
        AuditColumnsSubscriber,
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
      ],
    })
      .overrideProvider(MAIL_TRANSPORT)
      .useValue(mail)
      .compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    configureApplication(app, { enableSwagger: false });
    await app.init();

    return {
      app,
      dataSource: moduleRef.get(DataSource),
      mail,
      close: async () => {
        await app.close();
        await runOnTestDatabase(schemaStatement(schema, 'DROP SCHEMA IF EXISTS'));
      },
    };
  } catch (error) {
    await runOnTestDatabase(schemaStatement(schema, 'DROP SCHEMA IF EXISTS'));
    throw error;
  }
}

function schemaStatement(schema: string, verb: 'CREATE SCHEMA' | 'DROP SCHEMA IF EXISTS'): string {
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
