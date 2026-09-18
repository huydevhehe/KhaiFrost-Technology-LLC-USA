import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { ErrorCode } from '../constants/error-codes';
import { ApplicationException } from '../exceptions/application.exception';
import { ensureRequestId } from '../utils/request-id';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = ensureRequestId(request, response);

    const { status, body } = this.describe(exception);
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR && status !== HttpStatus.SERVICE_UNAVAILABLE) {
      this.logger.error(
        { requestId, path: request.originalUrl, method: request.method },
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (response.headersSent) return;
    response.status(status).json({ error: { ...body, requestId } });
  }

  private describe(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof ApplicationException) {
      return {
        status: exception.getStatus(),
        body: {
          code: exception.code,
          message: exception.message,
          ...(exception.details !== undefined && { details: exception.details }),
        },
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: { code: ErrorCode.RATE_LIMITED, message: 'Too many requests, please slow down' },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return { status, body: this.fromHttpException(exception, status) };
    }

    if (exception instanceof QueryFailedError) {
      const driverError = (exception as QueryFailedError & { driverError?: { code?: string } })
        .driverError;
      switch (driverError?.code) {
        case PG_UNIQUE_VIOLATION:
          return {
            status: HttpStatus.CONFLICT,
            body: {
              code: ErrorCode.CONFLICT,
              message: 'A record with the same unique value already exists',
            },
          };
        case PG_FOREIGN_KEY_VIOLATION:
          return {
            status: HttpStatus.CONFLICT,
            body: {
              code: ErrorCode.CONFLICT,
              message: 'The record is referenced by, or refers to, another record',
            },
          };
        case PG_INVALID_TEXT_REPRESENTATION:
          return {
            status: HttpStatus.BAD_REQUEST,
            body: { code: ErrorCode.VALIDATION_FAILED, message: 'A value has an invalid format' },
          };
      }
    }

    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: { code: ErrorCode.NOT_FOUND, message: 'Resource not found' },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error' },
    };
  }

  private fromHttpException(exception: HttpException, status: number): ErrorBody {
    const payload = exception.getResponse();
    const code =
      STATUS_TO_CODE[status] ?? (status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST);
    let message = exception.message;
    let details: unknown;
    if (typeof payload === 'object' && payload !== null) {
      const record = payload as Record<string, unknown>;
      if (Array.isArray(record.message)) details = record.message;
      else if (typeof record.message === 'string') message = record.message;
    }
    return { code, message, ...(details !== undefined && { details }) };
  }
}
