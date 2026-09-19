import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';
import { ApplicationException } from './application.exception';

export interface ValidationErrorDetail {
  field: string;
  messages: string[];
}

export function notFound(entity: string): ApplicationException {
  return new ApplicationException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, `${entity} not found`);
}

export function conflict(code: string, message: string, details?: unknown): ApplicationException {
  return new ApplicationException(code, HttpStatus.CONFLICT, message, details);
}

export function forbidden(
  message = 'You do not have permission to perform this action',
  code: string = ErrorCode.FORBIDDEN,
): ApplicationException {
  return new ApplicationException(code, HttpStatus.FORBIDDEN, message);
}

export function unauthorized(
  message = 'Authentication required',
  code: string = ErrorCode.UNAUTHORIZED,
): ApplicationException {
  return new ApplicationException(code, HttpStatus.UNAUTHORIZED, message);
}

export function adminSessionRequired(): ApplicationException {
  return new ApplicationException(
    ErrorCode.ADMIN_SESSION_REQUIRED,
    HttpStatus.FORBIDDEN,
    'An elevated admin session is required',
  );
}

export function passwordChangeRequired(): ApplicationException {
  return new ApplicationException(
    ErrorCode.PASSWORD_CHANGE_REQUIRED,
    HttpStatus.FORBIDDEN,
    'The password must be changed before anything else',
  );
}

export function badRequest(code: string, message: string, details?: unknown): ApplicationException {
  return new ApplicationException(code, HttpStatus.BAD_REQUEST, message, details);
}

export function validationFailed(details: ValidationErrorDetail[]): ApplicationException {
  return new ApplicationException(
    ErrorCode.VALIDATION_FAILED,
    HttpStatus.BAD_REQUEST,
    'Validation failed',
    details,
  );
}

export function translationMissing(
  missing: { locale: string; field: string }[],
): ApplicationException {
  return new ApplicationException(
    ErrorCode.TRANSLATION_MISSING,
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Required translations are missing',
    missing,
  );
}
