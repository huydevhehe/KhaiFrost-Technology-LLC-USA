import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MEDIA_FOLDER_PATTERN } from './upload-media.dto';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class MediaTranslationInputDto {
  @ApiPropertyOptional({ maxLength: 300, nullable: true, type: String })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(300)
  altText?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true, type: String })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(500)
  caption?: string | null;
}

export class MediaTranslationsInputDto {
  @ApiPropertyOptional({ type: MediaTranslationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaTranslationInputDto)
  vi?: MediaTranslationInputDto;

  @ApiPropertyOptional({ type: MediaTranslationInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaTranslationInputDto)
  en?: MediaTranslationInputDto;
}

export class UpdateMediaDto {
  @ApiPropertyOptional({
    minimum: 0,
    description: 'When sent, a stale version is rejected with 409',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number;

  @ApiPropertyOptional({ maxLength: 255, nullable: true, type: String })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(255)
  displayName?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true, type: String })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  @Matches(MEDIA_FOLDER_PATTERN, { message: 'folder contains invalid characters' })
  folder?: string | null;

  @ApiPropertyOptional({ type: MediaTranslationsInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaTranslationsInputDto)
  translations?: MediaTranslationsInputDto;
}
