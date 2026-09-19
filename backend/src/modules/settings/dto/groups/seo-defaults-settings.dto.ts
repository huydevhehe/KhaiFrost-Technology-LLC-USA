import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto';

export class SeoDefaultsSettingsDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  siteName!: string;

  @ApiProperty({ maxLength: 120, example: '%s | KhaiFrost Technology' })
  @IsString()
  @MaxLength(120)
  @Matches(/%s/, { message: 'titleTemplate must contain %s where the page title goes' })
  titleTemplate!: string;

  @ApiPropertyOptional({ type: LocalizedTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  defaultDescription?: LocalizedTextDto;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  defaultOgImageId?: string | null;

  @ApiPropertyOptional({ maxLength: 16, example: '@khaifrost' })
  @IsOptional()
  @IsString()
  @Matches(/^@?[A-Za-z0-9_]{1,15}$/, { message: 'twitterHandle is invalid' })
  twitterHandle?: string | null;
}
