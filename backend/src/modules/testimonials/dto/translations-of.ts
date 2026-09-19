import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

// Builds the { vi?, en? } wrapper used by every admin translation payload
export function TranslationsOf<T extends object>(translationClass: new () => T) {
  class Translations {
    @ApiPropertyOptional({ type: () => translationClass })
    @IsOptional()
    @ValidateNested()
    @Type(() => translationClass)
    vi?: T;

    @ApiPropertyOptional({ type: () => translationClass })
    @IsOptional()
    @ValidateNested()
    @Type(() => translationClass)
    en?: T;
  }
  return Translations;
}
