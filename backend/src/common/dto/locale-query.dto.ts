import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DEFAULT_LOCALE, Locale } from '../enums/locale.enum';

export class LocaleQueryDto {
  @ApiPropertyOptional({ enum: Locale, default: DEFAULT_LOCALE })
  @IsOptional()
  @IsEnum(Locale)
  locale: Locale = DEFAULT_LOCALE;
}
