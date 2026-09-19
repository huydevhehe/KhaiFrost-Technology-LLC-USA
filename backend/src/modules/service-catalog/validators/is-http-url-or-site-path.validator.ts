import { registerDecorator, ValidationOptions } from 'class-validator';

const HTTP_URL_PATTERN = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
const SITE_PATH_PATTERN = /^\/(?!\/)[^\s]*$/;

export function isHttpUrlOrSitePath(value: unknown): boolean {
  return (
    typeof value === 'string' && (HTTP_URL_PATTERN.test(value) || SITE_PATH_PATTERN.test(value))
  );
}

// Allows an absolute http(s) URL or a site-relative path such as /lien-he; rejects other schemes
export function IsHttpUrlOrSitePath(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      name: 'isHttpUrlOrSitePath',
      target: target.constructor,
      propertyName: propertyName as string,
      options: {
        message: `${String(propertyName)} must be an http(s) URL or a path starting with /`,
        ...validationOptions,
      },
      validator: { validate: isHttpUrlOrSitePath },
    });
  };
}
