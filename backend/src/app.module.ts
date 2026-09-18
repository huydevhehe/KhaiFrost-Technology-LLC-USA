import { join } from 'node:path';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validationExceptionFactory } from './common/filters/validation-exception.factory';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { OriginCheckMiddleware } from './common/middleware/origin-check.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ensureRequestId } from './common/utils/request-id';
import {
  appConfig,
  authConfig,
  BACKEND_ROOT,
  bootstrapOwnerConfig,
  databaseConfig,
  mailConfig,
  storageConfig,
  validateEnvironment,
} from './config';
import { DatabaseModule } from './database/database.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { ClientLocationsModule } from './modules/client-locations/client-locations.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ContentHealthModule } from './modules/content-health/content-health.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { MediaModule } from './modules/media/media.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PagesModule } from './modules/pages/pages.module';
import { PostsModule } from './modules/posts/posts.module';
import { ProductsModule } from './modules/products/products.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SearchModule } from './modules/search/search.module';
import { SeoModule } from './modules/seo/seo.module';
import { ServiceCatalogModule } from './modules/service-catalog/service-catalog.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TestimonialsModule } from './modules/testimonials/testimonials.module';
import { UiTranslationsModule } from './modules/ui-translations/ui-translations.module';
import { UsersModule } from './modules/users/users.module';

const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'code',
  '*.password',
  '*.code',
];

@Module({
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
    LoggerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ReturnType<typeof appConfig>) => ({
        pinoHttp: {
          level: config.isTest ? 'silent' : 'info',
          redact: { paths: LOG_REDACT_PATHS, censor: '[Redacted]' },
          genReqId: (request, response) => ensureRequestId(request, response),
          autoLogging: { ignore: (request) => request.url?.includes('/health') ?? false },
          transport: config.isProduction
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
        },
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
      // Lets automated tests exercise auth flows without tripping the limits
      skipIf: () => process.env.DISABLE_THROTTLING === 'true',
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CommonModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    AuditLogModule,
    MailModule,
    MediaModule,
    SeoModule,
    PostsModule,
    ProductsModule,
    FavoritesModule,
    CartModule,
    ServiceCatalogModule,
    ProjectsModule,
    TestimonialsModule,
    ClientLocationsModule,
    ContactsModule,
    PagesModule,
    NavigationModule,
    UiTranslationsModule,
    SettingsModule,
    ContentHealthModule,
    DashboardModule,
    NotificationsModule,
    SearchModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, OriginCheckMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
