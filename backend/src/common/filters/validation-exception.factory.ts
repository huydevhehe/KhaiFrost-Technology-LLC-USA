import { ValidationError } from 'class-validator';
import { ValidationErrorDetail, validationFailed } from '../exceptions/exception.factories';
import { ApplicationException } from '../exceptions/application.exception';

function collect(
  errors: ValidationError[],
  parentPath: string,
  sink: ValidationErrorDetail[],
): void {
  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    if (error.constraints) {
      sink.push({ field: path, messages: Object.values(error.constraints) });
    }
    if (error.children?.length) collect(error.children, path, sink);
  }
}

export function validationExceptionFactory(errors: ValidationError[]): ApplicationException {
  const details: ValidationErrorDetail[] = [];
  collect(errors, '', details);
  return validationFailed(details);
}
