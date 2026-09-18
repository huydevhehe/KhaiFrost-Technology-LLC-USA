import { applyDecorators, Controller, SetMetadata } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ACCESS_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } from '../constants/cookie-names';
import { joinRoutePath } from './route-path';

export const ADMIN_AREA_KEY = 'kf:adminArea';

export function AdminController(path: string): ClassDecorator {
  const fullPath = joinRoutePath('admin', path);
  return applyDecorators(
    Controller(fullPath),
    SetMetadata(ADMIN_AREA_KEY, true),
    ApiTags(fullPath),
    ApiCookieAuth(ACCESS_COOKIE_NAME),
    ApiCookieAuth(ADMIN_SESSION_COOKIE_NAME),
  );
}
