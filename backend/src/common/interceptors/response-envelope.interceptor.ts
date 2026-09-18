import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { map, Observable } from 'rxjs';
import { SKIP_RESPONSE_ENVELOPE_KEY } from '../decorators/skip-response-envelope.decorator';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { ResponseWithMeta } from '../dto/response-with-meta';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((result: unknown) => {
        if (response.statusCode === 204 || result instanceof StreamableFile) return result;
        if (result instanceof PaginatedResponseDto) {
          return { data: result.items, meta: result.meta };
        }
        if (result instanceof ResponseWithMeta) {
          return { data: result.data, meta: result.meta };
        }
        return { data: result === undefined ? null : result };
      }),
    );
  }
}
