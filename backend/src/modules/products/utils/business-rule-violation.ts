import { HttpStatus } from '@nestjs/common';
import { ApplicationException } from '../../../common/exceptions/application.exception';

// 422: the request is well formed but breaks a business rule
export function businessRuleViolation(
  code: string,
  message: string,
  details?: unknown,
): ApplicationException {
  return new ApplicationException(code, HttpStatus.UNPROCESSABLE_ENTITY, message, details);
}
