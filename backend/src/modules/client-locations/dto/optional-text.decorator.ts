import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Optional string that may be null (clears the value) with an explicit length cap
export function OptionalText(maxLength: number) {
  return applyDecorators(
    ApiPropertyOptional({ maxLength, nullable: true }),
    IsOptional(),
    IsString(),
    MaxLength(maxLength),
  );
}
