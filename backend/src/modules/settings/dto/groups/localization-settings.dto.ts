import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { Locale } from '../../../../common/enums/locale.enum';

export class LocalizationSettingsDto {
  @ApiProperty({ enum: Locale })
  @IsEnum(Locale)
  defaultLocale!: Locale;

  @ApiProperty({ enum: Locale, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(Locale, { each: true })
  enabledLocales!: Locale[];
}
