import { mkdirSync } from 'node:fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { Response } from 'express';
import helmet from 'helmet';
import { ACCESS_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } from '../common/constants/cookie-names';
import { REQUEST_ID_HEADER } from '../common/constants/http-headers';
import { appConfig } from '../config/app.config';
import { storageConfig } from '../config/storage.config';

export interface ConfigureAppOptions {
  enableSwagger?: boolean;
}

export function configureApplication(
  app: NestExpressApplication,
  options: ConfigureAppOptions = {},
): void {
  const config = app.get(appConfig.KEY);
  const storage = app.get(storageConfig.KEY);

  app.set('trust proxy', config.trustProxy);
  app.setGlobalPrefix(config.globalPrefix);

  app.use(
    helmet({
      // Swagger UI needs inline scripts; the API itself serves no HTML
      contentSecurityPolicy: config.isProduction,
      // The website on another origin loads uploaded images from here
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER],
  });

  mkdirSync(storage.uploadDir, { recursive: true });
  app.useStaticAssets(storage.uploadDir, {
    prefix: '/uploads',
    index: false,
    redirect: false,
    dotfiles: 'deny',
    maxAge: '365d',
    immutable: true,
    setHeaders: (response: Response) => {
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    },
  });

  app.enableShutdownHooks();

  if (config.swaggerEnabled && options.enableSwagger !== false) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('KhaiFrost API')
        .setVersion('1.0')
        .addCookieAuth(ACCESS_COOKIE_NAME, {
          type: 'apiKey',
          in: 'cookie',
          name: ACCESS_COOKIE_NAME,
        })
        .addCookieAuth(ADMIN_SESSION_COOKIE_NAME, {
          type: 'apiKey',
          in: 'cookie',
          name: ADMIN_SESSION_COOKIE_NAME,
        })
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }
}
