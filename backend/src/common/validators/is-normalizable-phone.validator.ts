import { registerDecorator, ValidationOptions } from 'class-validator';
import { normalizePhone } from '../utils/normalize-phone';

export function IsNormalizablePhone(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isNormalizablePhone',
      target: target.constructor,
      propertyName: propertyKey as string,
      options: { message: 'phone must be a valid phone number', ...validationOptions },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && normalizePhone(value) !== null,
      },
    });
  };
}
