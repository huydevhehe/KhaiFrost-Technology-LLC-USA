import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { validationExceptionFactory } from '../../../common/filters/validation-exception.factory';

// Same rules the HTTP layer applies; used by dry runs to report invalid content without writing it
export async function assertValidDto<T extends object>(
  dtoClass: ClassConstructor<T>,
  payload: object,
): Promise<void> {
  const errors = await validate(plainToInstance(dtoClass, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0) throw validationExceptionFactory(errors);
}
