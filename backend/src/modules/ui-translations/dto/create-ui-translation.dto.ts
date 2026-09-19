import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const UI_TRANSLATION_NAMESPACE_PATTERN = /^[A-Za-z0-9_-]+$/;
export const UI_TRANSLATION_KEY_PATTERN = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;

export class CreateUiTranslationDto {
  @ApiProperty({ maxLength: 60, example: 'translation' })
  @IsString()
  @MaxLength(60)
  @Matches(UI_TRANSLATION_NAMESPACE_PATTERN, { message: 'namespace contains invalid characters' })
  namespace!: string;

  @ApiProperty({ maxLength: 200, example: 'hero.headline', description: 'Dot separated path' })
  @IsString()
  @MaxLength(200)
  @Matches(UI_TRANSLATION_KEY_PATTERN, { message: 'key must be dot separated segments' })
  key!: string;

  @ApiPropertyOptional({ maxLength: 5000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  valueVi?: string | null;

  @ApiPropertyOptional({ maxLength: 5000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  valueEn?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true, description: 'Where the text is shown' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
