import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApplication } from './bootstrap/configure-app';
import { appConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApplication(app);

  const config = app.get(appConfig.KEY);
  await app.listen(config.port);
  app.get(Logger).log(`API listening on port ${config.port} at /${config.globalPrefix}`);
}

void bootstrap();
