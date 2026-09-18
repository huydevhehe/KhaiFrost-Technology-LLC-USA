import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { appConfig } from '../../config/app.config';
import { forbidden } from '../exceptions/exception.factories';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// CSRF defense: browsers always send Origin on cross-site unsafe requests
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly allowedOrigins: ReadonlySet<string>;

  constructor(@Inject(appConfig.KEY) config: ConfigType<typeof appConfig>) {
    this.allowedOrigins = new Set(config.corsOrigins);
  }

  use(request: Request, _response: Response, next: NextFunction): void {
    const origin = request.headers.origin;
    if (origin !== undefined && UNSAFE_METHODS.has(request.method)) {
      if (!this.allowedOrigins.has(origin)) {
        throw forbidden('Origin not allowed');
      }
    }
    next();
  }
}
