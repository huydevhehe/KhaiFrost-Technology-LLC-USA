import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../constants/post-constraints';

export class PostCategoryTranslationInputDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}

export class PostCategoryTranslationsInputDto {
  @ApiProperty({ type: () => PostCategoryTranslationInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PostCategoryTranslationInputDto)
  vi!: PostCategoryTranslationInputDto;

  @ApiProperty({ type: () => PostCategoryTranslationInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PostCategoryTranslationInputDto)
  en!: PostCategoryTranslationInputDto;
}

export class CreatePostCategoryDto {
  @ApiPropertyOptional({
    maxLength: SLUG_MAX_LENGTH,
    description: 'Generated from the vi name when omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by single hyphens' })
  slug?: string;

  @ApiProperty({ type: () => PostCategoryTranslationsInputDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PostCategoryTranslationsInputDto)
  translations!: PostCategoryTranslationsInputDto;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePostCategoryDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  version!: number;

  @ApiPropertyOptional({ maxLength: SLUG_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by single hyphens' })
  slug?: string;

  @ApiPropertyOptional({ type: () => PostCategoryTranslationsInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PostCategoryTranslationsInputDto)
  translations?: PostCategoryTranslationsInputDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
