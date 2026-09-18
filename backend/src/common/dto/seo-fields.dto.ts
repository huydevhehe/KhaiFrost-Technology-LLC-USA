import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, IsUrl, MaxLength } from 'class-validator';

// Spread into a translation DTO with `extends SeoFieldsDto` to accept the SeoTranslationEntity columns
export class SeoFieldsDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  seoTitle?: string | null;

  @ApiPropertyOptional({ maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string | null;

  @ApiPropertyOptional({ maxLength: 500, description: 'Comma separated' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoKeywords?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  canonicalUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  noIndex?: boolean;

  @ApiPropertyOptional({ description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  ogImageId?: string | null;
}
