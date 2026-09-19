import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class BrandingSettingsDto {
  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  logoId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id, logo for dark backgrounds' })
  @IsOptional()
  @IsUUID()
  logoDarkId?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'MediaAsset id' })
  @IsOptional()
  @IsUUID()
  faviconId?: string | null;

  @ApiPropertyOptional({ example: '#0a1f44' })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'brandColor must be a #RRGGBB hex color' })
  brandColor?: string | null;
}
