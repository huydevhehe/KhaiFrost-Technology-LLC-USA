import { applyDecorators, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './public.decorator';
import { joinRoutePath } from './route-path';

export function PublicController(path: string): ClassDecorator {
  const fullPath = joinRoutePath('public', path);
  return applyDecorators(Controller(fullPath), Public(), ApiTags(fullPath));
}
