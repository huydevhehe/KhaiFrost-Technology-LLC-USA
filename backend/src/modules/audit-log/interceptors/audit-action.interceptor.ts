import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { mergeMap, Observable } from 'rxjs';
import {
  AUDIT_ACTION_KEY,
  AuditActionMetadata,
} from '../../../common/decorators/audit-action.decorator';
import { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface';
import { AuditLogService } from '../services/audit-log.service';

function readId(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined;
}

// Works whether the response envelope has already been applied ({ data }) or not
export function extractEntityId(result: unknown, routeId: unknown): string | undefined {
  return (
    readId(result) ??
    readId((result as { data?: unknown } | null | undefined)?.data) ??
    (typeof routeId === 'string' ? routeId : undefined)
  );
}

@Injectable()
export class AuditActionInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const metadata = this.reflector.getAllAndOverride<AuditActionMetadata | undefined>(
      AUDIT_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata) return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    // Recorded only after the handler succeeded; awaited so the entry exists once the client sees the result
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        await this.auditLog.record({
          action: metadata.action,
          entityName: metadata.entityName ?? null,
          entityId: extractEntityId(result, request.params?.id) ?? null,
          actorId: request.user?.id ?? null,
          actorRole: request.user?.role ?? null,
          statusCode: response.statusCode,
          metadata: {
            method: request.method,
            route: request.route?.path ?? request.path,
          },
        });
        return result;
      }),
    );
  }
}
