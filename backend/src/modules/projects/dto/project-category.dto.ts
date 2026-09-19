import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { SLUG_PATTERN } from '../constants/project.constants';
import { OptionalText } from './optional-text.decorator';
import { TranslationsOf } from './translations-of';

export class ProjectCategoryTranslationDto {
  @OptionalText(150) name?: string | null;
}
export class ProjectCategoryTranslationsDto extends TranslationsOf(ProjectCategoryTranslationDto) {}

export class CreateProjectCategoryDto {
  @ApiPropertyOptional({ maxLength: 200, description: 'Generated from the vi name when omitted' })
  @IsOptional()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens' })
  slug?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiProperty({ type: ProjectCategoryTranslationsDto, description: 'Both locales are required' })
  @ValidateNested()
  @Type(() => ProjectCategoryTranslationsDto)
  translations!: ProjectCategoryTranslationsDto;
}

export class UpdateProjectCategoryDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @MaxLength(200)
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase words separated by hyphens' })
  slug?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  sortOrder?: number;

  @ApiPropertyOptional({ type: ProjectCategoryTranslationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectCategoryTranslationsDto)
  translations?: ProjectCategoryTranslationsDto;
}
