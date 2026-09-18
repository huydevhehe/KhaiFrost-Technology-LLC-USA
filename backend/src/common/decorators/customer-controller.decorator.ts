import { applyDecorators, Controller } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ACCESS_COOKIE_NAME } from '../constants/cookie-names';
import { joinRoutePath } from './route-path';

export function CustomerController(path: string): ClassDecorator {
  const fullPath = joinRoutePath('me', path);
  return applyDecorators(
    Controller(fullPath),
    ApiTags(fullPath),
    ApiCookieAuth(ACCESS_COOKIE_NAME),
  );
}
